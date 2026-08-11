import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import type { Prisma } from "@amni/db";
import { createErpClientForTenant, type ErpClient } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "../common/api.exception";

export interface GatewayUser {
  id: string;
  email: string;
  role: string;
}

export interface GatewayRequestMeta {
  ip?: string;
  requestId?: string;
}

interface ClientScope {
  companyId: string;
  client: ErpClient;
}

interface AuditEntry {
  user: GatewayUser;
  meta: GatewayRequestMeta;
  companyId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tenant-scoped ERP proxy. The tenant ERP instance is resolved server-side
 * from the authenticated user's Membership (never from client input), its
 * service-account keys are decrypted from the ERPInstance record, and every
 * call to the tenant site goes through `packages/erp`. Mutations are
 * recorded in the AuditLog with the acting user and company.
 */
@Injectable()
export class ErpGatewayService {
  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    doctype: string,
    query: { filters?: Record<string, unknown>; fields?: string[]; orderBy?: string; limitPageLength?: number; start?: number },
  ): Promise<{ items: Record<string, unknown>[]; hasMore: boolean }> {
    const { client } = await this.scopeFor(user.id, meta.requestId);
    return client.list<Record<string, unknown>>(doctype, {
      filters: query.filters,
      fields: query.fields,
      orderBy: query.orderBy,
      limitPageLength: query.limitPageLength,
      start: query.start,
    });
  }

  async get(user: GatewayUser, meta: GatewayRequestMeta, doctype: string, name: string): Promise<Record<string, unknown>> {
    const { client } = await this.scopeFor(user.id, meta.requestId);
    return client.get<Record<string, unknown>>(doctype, name);
  }

  async create(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    doctype: string,
    doc: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const scope = await this.scopeFor(user.id, meta.requestId);
    const created = await scope.client.create<Record<string, unknown>>(doctype, doc);
    await this.audit({
      user,
      meta,
      companyId: scope.companyId,
      action: "erp.create",
      resourceType: doctype,
      resourceId: String(created.name),
    });
    return created;
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    doctype: string,
    name: string,
    action: "submit" | "cancel" | undefined,
    doc: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const scope = await this.scopeFor(user.id, meta.requestId);
    const updated =
      action === "submit"
        ? await scope.client.submit<Record<string, unknown>>(doctype, name)
        : action === "cancel"
          ? await scope.client.cancel<Record<string, unknown>>(doctype, name)
          : await scope.client.update<Record<string, unknown>>(doctype, name, doc);
    await this.audit({
      user,
      meta,
      companyId: scope.companyId,
      action: "erp.update",
      resourceType: doctype,
      resourceId: name,
      metadata: action ? { action } : undefined,
    });
    return updated;
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, doctype: string, name: string): Promise<void> {
    const scope = await this.scopeFor(user.id, meta.requestId);
    await scope.client.delete(doctype, name);
    await this.audit({
      user,
      meta,
      companyId: scope.companyId,
      action: "erp.delete",
      resourceType: doctype,
      resourceId: name,
    });
  }

  async call(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    method: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const scope = await this.scopeFor(user.id, meta.requestId);
    const message = await scope.client.call<unknown>(method, args);
    await this.audit({
      user,
      meta,
      companyId: scope.companyId,
      action: "erp.call",
      resourceType: "method",
      resourceId: method,
    });
    return message;
  }

  private async scopeFor(userId: string, requestId?: string): Promise<ClientScope> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { companyId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      throw new ApiException({
        code: ErrorCode.FORBIDDEN,
        status: 403,
        message: "No workspace membership for this account",
      });
    }
    const client = await createErpClientForTenant({ companyId: membership.companyId, requestId });
    return { companyId: membership.companyId, client };
  }

  private async audit(entry: AuditEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: entry.user.id,
        actorEmail: entry.user.email,
        companyId: entry.companyId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        ip: entry.meta.ip,
        requestId: entry.meta.requestId,
      },
    });
  }
}
