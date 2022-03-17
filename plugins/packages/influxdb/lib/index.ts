import { ConnectionTestResult, QueryError, QueryResult, QueryService } from '@tooljet-plugins/common';
import { SourceOptions, QueryOptions } from './types';
import got, { Headers } from 'got';
const JSON5 = require('json5');

export default class influxdb implements QueryService {
  async run(sourceOptions: SourceOptions, queryOptions: QueryOptions): Promise<QueryResult> {
    let result = {};
    let response = null;
    const apiKey = sourceOptions.api_token;
    const { port, host, protocol } = sourceOptions;
    const { operation, bucket_id, bucket, org, orgID, precision } = queryOptions;

    const authHeader = (token: string): Headers => {
      return {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      };
    };

    try {
      switch (operation) {
        case 'list_buckets': {
          response = await got(`${protocol}://${host}:${port}/api/v2/buckets`, {
            method: 'get',
            headers: authHeader(apiKey),
          });

          result = JSON.parse(response.body);
          break;
        }
        case 'retrieve_bucket': {
          response = await got(`${protocol}://${host}:${port}/api/v2/buckets/${bucket_id}`, {
            headers: authHeader(apiKey),
            method: 'get',
          });
          result = this.parseJSON(response.body);
          break;
        }

        case 'create_bucket': {
          response = await got(`${protocol}://${host}:${port}/api/v2/buckets`, {
            method: 'post',
            headers: authHeader(apiKey),
            json: {
              records: this.parseJSON(queryOptions.body),
            },
          });
          result = this.parseJSON(response.body);
          break;
        }

        case 'update_bucket': {
          response = await got(`${protocol}://${host}:${port}/api/v2/buckets/${bucket_id}`, {
            method: 'put',
            headers: authHeader(apiKey),
            json: {
              records: this.parseJSON(queryOptions.body),
            },
          });
          result = this.parseJSON(response.body);
          break;
        }

        case 'delete_bucket': {
          response = await got(`${protocol}://${host}:${port}/api/v2/buckets/${bucket_id}`, {
            method: 'delete',
            headers: authHeader(apiKey),
          });
          result = this.parseJSON(response.body);
          break;
        }

        case 'write': {
          response = await got(`${protocol}://${host}:${port}/api/v2/write`, {
            method: 'post',
            headers: authHeader(apiKey),
            searchParams: {
              ...(bucket?.length > 0 && { bucket }),
              ...(org?.length > 0 && { org }),
              ...(orgID && { orgID }),
              ...(precision && { precision }),
            },
          });
          result = this.parseJSON(response.body);
          break;
        }
      }
    } catch (error) {
      console.log(error);
      throw new QueryError('Query could not be completed', error.message, {});
    }

    return {
      status: 'ok',
      data: result,
    };
  }
  async testConnection(sourceOptions: SourceOptions): Promise<ConnectionTestResult> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { port, host, database, protocol, api_token } = sourceOptions;
    const client = await got(`${protocol}://${host}:${port}/influxdb/cloud/api//ping`, {
      method: 'get',
      headers: { Authorization: `Token ${api_token}` },
    });
    if (!client) {
      throw new Error('Error');
    }
    return {
      status: 'ok',
    };
  }
  private parseJSON(json?: string): object {
    if (!json) return {};

    return JSON5.parse(json);
  }
}
