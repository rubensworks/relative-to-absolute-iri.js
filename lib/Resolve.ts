/**
 * Convert the given relative IRI to an absolute IRI
 * by taking into account the given optional baseIRI.
 *
 * @param {string} relativeIRI The relative IRI to convert to an absolute IRI.
 * @param {string} baseIRI The optional base IRI.
 * @return {string} an absolute IRI.
 */
export function resolve(relativeIRI: string, baseIRI?: string): string {
  baseIRI = baseIRI || '';
  const baseFragmentPos: number = baseIRI.indexOf('#');

  // Ignore any fragments in the base IRI
  if (baseFragmentPos > 0) {
    baseIRI = baseIRI.substr(0, baseFragmentPos);
  }

  // Convert empty value directly to base IRI
  if (!relativeIRI.length) {
    return baseIRI;
  }

  // If the value starts with a hash, concat directly
  if (relativeIRI.startsWith('#')) {
    return baseIRI + relativeIRI;
  }

  // Ignore baseIRI if it is empty
  if (!baseIRI.length) {
    return relativeIRI;
  }

  // Ignore baseIRI if the value is absolute
  const valueColonPos: number = relativeIRI.indexOf(':');
  if (valueColonPos >= 0) {
    return relativeIRI;
  }

  // At this point, the baseIRI MUST be absolute, otherwise we error
  const baseColonPos: number = baseIRI.indexOf(':');
  if (baseColonPos < 0) {
    throw new Error(`Found invalid baseIRI '${baseIRI}' for value '${relativeIRI}'`);
  }

  const baseIRIScheme = baseIRI.substr(0, baseColonPos + 1);
  // Inherit the baseIRI scheme if the value starts with '//'
  if (relativeIRI.indexOf('//') === 0) {
    return baseIRIScheme + relativeIRI;
  }

  // Check cases where '://' occurs in the baseIRI, and where there is no '/' after a ':' anymore.
  let baseSlashAfterColonPos;
  if (baseIRI.indexOf('//', baseColonPos) === baseColonPos + 1) {
    // If there is no additional '/' after the '//'.
    baseSlashAfterColonPos = baseIRI.indexOf('/', baseColonPos + 3);
    if (baseSlashAfterColonPos < 0) {
      // If something other than a '/' follows the '://', append the value after a '/',
      // otherwise, prefix the value with only the baseIRI scheme.
      if (baseIRI.length > baseColonPos + 3) {
        return baseIRI + '/' + relativeIRI;
      } else {
        return baseIRIScheme + relativeIRI;
      }
    }
  } else {
    // If there is not even a single '/' after the ':'
    baseSlashAfterColonPos = baseIRI.indexOf('/', baseColonPos + 1);
    // Always true: baseSlashAfterColonPos < 0
    // If something other than a '/' follows the ':', append the value after a '/',
    // otherwise, prefix the value with only the baseIRI scheme.
    if (baseIRI.length > baseColonPos + 1) {
      return baseIRI + '/' + relativeIRI;
    } else {
      return baseIRIScheme + relativeIRI;
    }
  }

  // If the value starts with a '/', then prefix it with everything before the first effective slash of the base IRI.
  if (relativeIRI.indexOf('/') === 0) {
    return baseIRI.substr(0, baseSlashAfterColonPos) + relativeIRI;
  }

  let baseIRIPath = baseIRI.substr(baseSlashAfterColonPos);
  const baseIRILastSlashPos = baseIRIPath.lastIndexOf('/');

  // Ignore everything after the last '/' in the baseIRI path
  if (baseIRILastSlashPos >= 0 && baseIRILastSlashPos < baseIRIPath.length - 1) {
    baseIRIPath = baseIRIPath.substr(0, baseIRILastSlashPos + 1);
  }

  // Prefix the value with the baseIRI path where
  relativeIRI = baseIRIPath + relativeIRI;
  // Remove all occurrences of '*/../' to collapse paths to parents
  while (relativeIRI.match(/[^\/]*\/\.\.\//)) {
    relativeIRI = relativeIRI.replace(/[^\/]*\/\.\.\//, '');
  }
  // Remove all occurrences of './'
  relativeIRI = relativeIRI.replace(/\.\//g, '');
  // Remove suffix '/.'
  relativeIRI = relativeIRI.replace(/\/\.$/, '/');

  // Prefix our transformed value with the part of the baseIRI until the first '/' after the first ':'.
  return baseIRI.substr(0, baseSlashAfterColonPos) + relativeIRI;
}
