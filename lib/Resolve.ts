/**
 * Splits an IRI into its scheme, authority, path, query and fragment (RFC 3986, appendix B).
 * Every string matches. An absent component is undefined, an empty one is ''.
 */
const IRI_COMPONENTS = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#([\s\S]*))?$/;

/**
 * The same as IRI_COMPONENTS, for an IRI without a scheme.
 */
const RELATIVE_IRI_COMPONENTS = /^(?:\/\/([^/?#]*))?([^?#]*)([\s\S]*)$/;

interface IIriComponents {
  scheme?: string;
  authority?: string;
  path: string;
  query?: string;
  fragment?: string;
}

/**
 * Convert the given relative IRI to an absolute IRI
 * by taking into account the given optional baseIRI.
 *
 * With a baseIRI that has a scheme, this follows RFC 3986, section 5.2.
 *
 * @param {string} relativeIRI The relative IRI to convert to an absolute IRI.
 * @param {string} baseIRI The optional base IRI.
 * @return {string} an absolute IRI.
 */
export function resolve(relativeIRI: string, baseIRI?: string): string {
  const reference = parseIri(relativeIRI);

  // A value with a scheme does not need the baseIRI
  if (reference.scheme !== undefined) {
    const referencePath = removeDotSegmentsOfIriPath(reference.path);
    return referencePath === reference.path ? relativeIRI :
      composeIri(reference.scheme, reference.authority, referencePath, reference.query, reference.fragment);
  }

  // The fragment of the baseIRI never applies
  baseIRI = baseIRI || '';
  const baseFragmentPos = baseIRI.indexOf('#');
  if (baseFragmentPos > 0) {
    baseIRI = baseIRI.substr(0, baseFragmentPos);
  }

  const base = parseIri(baseIRI);
  if (base.scheme === undefined) {
    return resolveWithoutBaseScheme(relativeIRI, baseIRI);
  }

  // RFC 3986, section 5.2.2
  let authority: string | undefined;
  let path: string;
  let query: string | undefined;
  if (reference.authority !== undefined) {
    authority = reference.authority;
    path = removeDotSegmentsOfIriPath(reference.path);
    query = reference.query;
  } else if (!reference.path) {
    authority = base.authority;
    path = base.path;
    query = reference.query !== undefined ? reference.query : base.query;
  } else {
    authority = base.authority;
    // Deviation from RFC 3986: a baseIRI such as 'file://' is resolved against its scheme only
    if (authority === '' && !base.path) {
      authority = undefined;
    }
    path = removeDotSegmentsOfIriPath(reference.path[0] === '/' ?
      reference.path : mergePaths(authority, base.path, reference.path));
    query = reference.query;
  }
  return composeIri(base.scheme, authority, path, query, reference.fragment);
}

/**
 * Resolve against a baseIRI that is missing or has no scheme.
 * A fragment or query is appended to it as is, any other value is an error.
 * @param {string} relativeIRI A relative IRI without a scheme.
 * @param {string} baseIRI A baseIRI without a fragment.
 * @return {string} The resolved IRI.
 */
function resolveWithoutBaseScheme(relativeIRI: string, baseIRI: string): string {
  if (relativeIRI[0] === '#') {
    return baseIRI + relativeIRI;
  }
  const baseQueryPos = baseIRI.indexOf('?');
  const baseWithoutQuery = baseQueryPos > 0 ? baseIRI.substr(0, baseQueryPos) : baseIRI;
  if (relativeIRI[0] === '?') {
    return baseWithoutQuery + relativeIRI;
  }
  if (!relativeIRI) {
    throw new Error(`Found invalid baseIRI '${baseIRI}' for value ''`);
  }
  if (!baseIRI) {
    throw new Error(`Found invalid relative IRI '${relativeIRI}' for a missing baseIRI`);
  }
  throw new Error(`Found invalid baseIRI '${baseWithoutQuery}' for value '${relativeIRI}'`);
}

/**
 * Merge a relative path with the path of a baseIRI (RFC 3986, section 5.2.3).
 * @param {string} baseAuthority The authority of the baseIRI, or undefined.
 * @param {string} basePath The path of the baseIRI.
 * @param {string} path A relative path.
 * @return {string} The merged path.
 */
function mergePaths(baseAuthority: string | undefined, basePath: string, path: string): string {
  if (baseAuthority !== undefined && !basePath) {
    return '/' + path;
  }
  return basePath.substr(0, basePath.lastIndexOf('/') + 1) + path;
}

/**
 * Remove dot segments from a path (RFC 3986, section 5.2.4).
 * @param {string} path The path of an IRI, without query or fragment.
 * @return {string} The path without dot segments.
 */
function removeDotSegmentsOfIriPath(path: string): string {
  if (path.indexOf('.') < 0) {
    return path;
  }

  // Each output segment keeps its leading '/', if any
  const output: string[] = [];
  let i = 0;
  while (i < path.length) {
    if (path.startsWith('../', i)) {
      // A: remove a leading '../'
      i += 3;
    } else if (path.startsWith('./', i)) {
      // A: remove a leading './'
      i += 2;
    } else if (path.startsWith('/./', i)) {
      // B: replace '/./' with '/'
      i += 2;
    } else if (path.startsWith('/.', i) && i + 2 === path.length) {
      // B: replace a final '/.' with '/'
      output.push('/');
      break;
    } else if (path.startsWith('/../', i)) {
      // C: replace '/../' with '/' and remove the last output segment
      output.pop();
      i += 3;
    } else if (path.startsWith('/..', i) && i + 3 === path.length) {
      // C: replace a final '/..' with '/' and remove the last output segment
      output.pop();
      output.push('/');
      break;
    } else if ((path.startsWith('.', i) && i + 1 === path.length) ||
      (path.startsWith('..', i) && i + 2 === path.length)) {
      // D: remove a remaining '.' or '..'
      break;
    } else {
      // E: move the first segment, with its leading '/', to the output
      let end = path.indexOf('/', i + 1);
      if (end < 0) {
        end = path.length;
      }
      output.push(path.substr(i, end - i));
      i = end;
    }
  }
  return output.join('');
}

function parseIri(iri: string): IIriComponents {
  const match = IRI_COMPONENTS.exec(iri);
  return { scheme: match[1], authority: match[2], path: match[3], query: match[4], fragment: match[5] };
}

function composeIri(scheme: string, authority: string | undefined, path: string,
                    query: string | undefined, fragment: string | undefined): string {
  let iri = scheme + ':';
  if (authority !== undefined) {
    iri += '//' + authority;
  }
  iri += path;
  if (query !== undefined) {
    iri += '?' + query;
  }
  if (fragment !== undefined) {
    iri += '#' + fragment;
  }
  return iri;
}

/**
 * Remove dot segments from the given path,
 * as described in https://www.ietf.org/rfc/rfc3986.txt (page 32).
 * A query or fragment after the path is kept as is.
 * @param {string} path An IRI path, optionally followed by a query or fragment.
 * @return {string} A path, will always start with a '/'.
 */
export function removeDotSegments(path: string): string {
  const pathEnd = path.search(/[?#]|$/);
  const pathOnly = path.substr(0, pathEnd);
  return removeDotSegmentsOfIriPath(pathOnly[0] === '/' ? pathOnly : '/' + pathOnly) + path.substr(pathEnd);
}

/**
 * Removes dot segments of the given IRI.
 * @param {string} iri An IRI (or part of IRI).
 * @param {number} colonPosition The position of the ':' that ends the scheme of the IRI, or -1 if it has no scheme.
 * @return {string} The IRI where dot segments were removed.
 */
export function removeDotSegmentsOfPath(iri: string, colonPosition: number): string {
  const match = RELATIVE_IRI_COMPONENTS.exec(iri.substr(colonPosition + 1));
  return iri.substr(0, colonPosition + 1) + (match[1] !== undefined ? '//' + match[1] : '') +
    removeDotSegmentsOfIriPath(match[2]) + match[3];
}
