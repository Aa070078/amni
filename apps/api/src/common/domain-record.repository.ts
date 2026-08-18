import { Injectable } from "@nestjs/common";
import {
  AMNI_DOMAIN_RECORD_DOCTYPE,
  buildDomainRecordDocument,
  domainRecordKey,
  listDomainRecords,
  parseDomainRecordDocument,
  type DomainRecordIndexes,
  type ListDomainRecordsOptions,
} from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "./api.exception";
// ErpGatewayService must remain a value import for Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ErpGatewayService,
  translateErpError,
  type GatewayRequestMeta,
  type GatewayUser,
} from "../erp-gateway/erp-gateway.service";

export type DomainName = "equity" | "esg" | "sign";

@Injectable()
export class DomainRecordRepository {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list<T>(user: GatewayUser, meta: GatewayRequestMeta, domain: DomainName, recordType: string, options: ListDomainRecordsOptions = {}): Promise<{ items: T[]; total: number }> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    return listDomainRecords<T>(client, domain, recordType, options);
  }

  async get<T>(user: GatewayUser, meta: GatewayRequestMeta, domain: DomainName, recordType: string, code: string): Promise<T> {
    try {
      const document = await this.gateway.get(user, meta, AMNI_DOMAIN_RECORD_DOCTYPE, domainRecordKey(domain, recordType, code));
      if (document.domain !== domain || document.record_type !== recordType) {
        throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `${domain} ${recordType} ${code} not found` });
      }
      return parseDomainRecordDocument<T>(document);
    } catch (error) {
      translateErpError(error, `${domain} ${recordType} ${code}`);
    }
  }

  async create<T extends object>(user: GatewayUser, meta: GatewayRequestMeta, domain: DomainName, recordType: string, code: string, record: T, indexes: DomainRecordIndexes = {}): Promise<T> {
    const document = await this.gateway.create(user, meta, AMNI_DOMAIN_RECORD_DOCTYPE, buildDomainRecordDocument(domain, recordType, code, record, indexes));
    return parseDomainRecordDocument<T>(document);
  }

  async update<T extends object>(user: GatewayUser, meta: GatewayRequestMeta, domain: DomainName, recordType: string, code: string, record: T, indexes: DomainRecordIndexes = {}): Promise<T> {
    try {
      const document = await this.gateway.update(user, meta, AMNI_DOMAIN_RECORD_DOCTYPE, domainRecordKey(domain, recordType, code), undefined, buildDomainRecordDocument(domain, recordType, code, record, indexes));
      return parseDomainRecordDocument<T>(document);
    } catch (error) {
      translateErpError(error, `${domain} ${recordType} ${code}`);
    }
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, domain: DomainName, recordType: string, code: string): Promise<void> {
    await this.get(user, meta, domain, recordType, code);
    try {
      await this.gateway.remove(user, meta, AMNI_DOMAIN_RECORD_DOCTYPE, domainRecordKey(domain, recordType, code));
    } catch (error) {
      translateErpError(error, `${domain} ${recordType} ${code}`);
    }
  }
}
