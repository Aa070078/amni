import { Injectable } from "@nestjs/common";
import {
  AMNI_CRM_RECORD_DOCTYPE,
  buildCrmRecordDocument,
  listCrmRecords,
  parseCrmRecordDocument,
  type CrmRecordIndexes,
  type ListCrmRecordsOptions,
} from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "../common/api.exception";
// ErpGatewayService must remain a value import for Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ErpGatewayService,
  translateErpError,
  type GatewayRequestMeta,
  type GatewayUser,
} from "../erp-gateway/erp-gateway.service";

export type CrmRecordType =
  | "activity"
  | "call_log"
  | "contact"
  | "email_template"
  | "event"
  | "note"
  | "notification"
  | "organization"
  | "settings"
  | "task"
  | "view"
  | "whatsapp_message";

@Injectable()
export class CrmRecordRepository {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list<T>(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    recordType: CrmRecordType,
    options: ListCrmRecordsOptions = {},
  ): Promise<{ items: T[]; total: number }> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    return listCrmRecords<T>(client, recordType, options);
  }

  async get<T>(user: GatewayUser, meta: GatewayRequestMeta, recordType: CrmRecordType, code: string): Promise<T> {
    try {
      const document = await this.gateway.get(user, meta, AMNI_CRM_RECORD_DOCTYPE, code);
      if (document.record_type !== recordType) {
        throw new ApiException({
          code: ErrorCode.NOT_FOUND,
          status: 404,
          message: `CRM ${recordType} ${code} not found`,
        });
      }
      return parseCrmRecordDocument<T>(document);
    } catch (error) {
      translateErpError(error, `CRM ${recordType} ${code}`);
    }
  }

  async create<T extends object>(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    recordType: CrmRecordType,
    code: string,
    record: T,
    indexes: CrmRecordIndexes = {},
  ): Promise<T> {
    const document = await this.gateway.create(
      user,
      meta,
      AMNI_CRM_RECORD_DOCTYPE,
      buildCrmRecordDocument(recordType, code, record, indexes),
    );
    return parseCrmRecordDocument<T>(document);
  }

  async update<T extends object>(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    recordType: CrmRecordType,
    code: string,
    record: T,
    indexes: CrmRecordIndexes = {},
  ): Promise<T> {
    try {
      const document = await this.gateway.update(
        user,
        meta,
        AMNI_CRM_RECORD_DOCTYPE,
        code,
        undefined,
        buildCrmRecordDocument(recordType, code, record, indexes),
      );
      return parseCrmRecordDocument<T>(document);
    } catch (error) {
      translateErpError(error, `CRM ${recordType} ${code}`);
    }
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, recordType: CrmRecordType, code: string): Promise<void> {
    await this.get(user, meta, recordType, code);
    try {
      await this.gateway.remove(user, meta, AMNI_CRM_RECORD_DOCTYPE, code);
    } catch (error) {
      translateErpError(error, `CRM ${recordType} ${code}`);
    }
  }
}
