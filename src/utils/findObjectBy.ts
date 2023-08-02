/** Returns the first child (or the same given object) that meets the given criteria. */
export function findObjectBy(obj: THREE.Object3D, criteria: (child: THREE.Object3D) => boolean): THREE.Object3D {
  if (criteria(obj)) return obj;

  for (let child of obj.children) {
    const found = findObjectBy(child, criteria);
    if (found) return found;
  }

  return undefined;
}

/** Returns all children (or the same given object) that meet the given criteria. */
export function findObjectsBy(obj: THREE.Object3D, criteria: (child: THREE.Object3D) => boolean): THREE.Object3D[] {
  const result = [];

  if (criteria(obj)) result.push(obj);

  for (let child of obj.children) {
    const found = findObjectBy(child, criteria);
    if (found) result.push(found);
  }

  return result;
}
