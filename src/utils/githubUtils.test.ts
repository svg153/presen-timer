import { describe, expect, it } from 'vitest';
import { buildRequestHeaders, classifyGithubStatus } from './githubUtils';

describe('classifyGithubStatus', () => {
  it('mapea 401 a unauthorized (token rechazado)', () => {
    expect(classifyGithubStatus(401)).toBe('unauthorized');
  });

  it('mantiene 404/451 como notFound y 403/429 como rateLimited', () => {
    expect(classifyGithubStatus(404)).toBe('notFound');
    expect(classifyGithubStatus(451)).toBe('notFound');
    expect(classifyGithubStatus(403)).toBe('rateLimited');
    expect(classifyGithubStatus(429)).toBe('rateLimited');
    expect(classifyGithubStatus(500)).toBe('error');
  });
});

describe('buildRequestHeaders', () => {
  it('sin token ni etag solo envía cabeceras de API', () => {
    const headers = buildRequestHeaders(null, null);
    expect(headers.Accept).toBe('application/vnd.github+json');
    expect(headers.Authorization).toBeUndefined();
    expect(headers['If-None-Match']).toBeUndefined();
  });

  it('con token añade Authorization Bearer con el valor recortado', () => {
    const headers = buildRequestHeaders('  ghp_xxxx  ', null);
    expect(headers.Authorization).toBe('Bearer ghp_xxxx');
  });

  it('token en blanco se trata como ausente', () => {
    expect(buildRequestHeaders('   ', null).Authorization).toBeUndefined();
  });

  it('con etag mantiene la comprobación condicional If-None-Match', () => {
    const headers = buildRequestHeaders('ghp_xxxx', 'W/"abc123"');
    expect(headers['If-None-Match']).toBe('W/"abc123"');
    expect(headers.Authorization).toBe('Bearer ghp_xxxx');
  });
});
