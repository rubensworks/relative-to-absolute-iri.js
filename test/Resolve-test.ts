import {resolve} from "../lib/Resolve";

describe('#resolve', () => {
  it('create an IRI from an absolute IRI when no baseIRI is given', () => {
    expect(resolve('http://example.org/'))
      .toEqual('http://example.org/');
  });

  it('create an IRI from an absolute IRI when the baseIRI is empty', () => {
    expect(resolve('http://example.org/', ''))
      .toEqual('http://example.org/');
  });

  it('create an IRI from an absolute IRI when a baseIRI is given', () => {
    expect(resolve('http://example.org/', 'http://base.org/'))
      .toEqual('http://example.org/');
  });

  it('create an IRI from the baseIRI when given value is empty', () => {
    expect(resolve('', 'http://base.org/'))
      .toEqual('http://base.org/');
  });

  it('create an IRI from a relative IRI when no baseIRI is given', () => {
    expect(resolve('abc'))
      .toEqual('abc');
  });

  it('create an IRI from a relative IRI when a baseIRI is given', () => {
    expect(resolve('abc', 'http://base.org/'))
      .toEqual('http://base.org/abc');
  });

  it('create an IRI from a relative IRI when a baseIRI is given and ignore the baseIRI fragment', () => {
    expect(resolve('abc', 'http://base.org/#frag'))
      .toEqual('http://base.org/abc');
  });

  it('create an IRI from a hash', () => {
    expect(resolve('#abc', 'http://base.org/'))
      .toEqual('http://base.org/#abc');
  });

  it('create an IRI and ignore the baseIRI if the value contains a colon', () => {
    expect(resolve('http:abc', 'http://base.org/'))
      .toEqual('http:abc');
  });

  it('error for a non-absolute baseIRI', () => {
    expect(() => resolve('abc', 'def')).toThrow();
  });

  it('create an IRI that has the baseIRI scheme if the value starts with //', () => {
    expect(resolve('//abc', 'http://base.org/'))
      .toEqual('http://abc');
  });

  it('create an IRI from a baseIRI without a / in the path', () => {
    expect(resolve('abc', 'http://base.org'))
      .toEqual('http://base.org/abc');
  });

  it('create an IRI from the baseIRI scheme when the baseIRI contains only ://', () => {
    expect(resolve('abc', 'http://'))
      .toEqual('http:abc');
  });

  it('create an IRI from the baseIRI if something other than a / follows the :', () => {
    expect(resolve('abc', 'http:a'))
      .toEqual('http:a/abc');
  });

  it('create an IRI from the baseIRI scheme if nothing follows the :', () => {
    expect(resolve('abc', 'http:'))
      .toEqual('http:abc');
  });

  it('create an IRI from an absolute path and ignore the path from the base IRI', () => {
    expect(resolve('/abc/def/', 'http://base.org/123/456/'))
      .toEqual('http://base.org/abc/def/');
  });

  it('create an IRI from a baseIRI with http:// and ignore everything after the last slash', () => {
    expect(resolve('xyz', 'http://aa/a'))
      .toEqual('http://aa/xyz');
  });

  it('create an IRI from a baseIRI with http:// and collapse parent paths', () => {
    expect(resolve('xyz', 'http://aa/parent/parent/../../a'))
      .toEqual('http://aa/xyz');
  });

  it('create an IRI from a baseIRI with http:// and remove current-dir paths', () => {
    expect(resolve('xyz', 'http://aa/././a'))
      .toEqual('http://aa/xyz');
  });
});
