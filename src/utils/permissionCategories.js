export const permissionCategories = {
  platform: [
    ["Dataset publishing", ["dataset.create", "dataset.approve", "dataset.publish"]],
    ["Users and permission management", ["user.view", "user.manage", "user.permission.grant", "user.permission.revoke"]],
    ["Groups", ["group.create", "group.edit", "group.delete", "group.member.manage", "group.permission.manage"]],
    ["Projects and collections", ["project.create", "collection.create"]],
    ["Requests and audit", [
      "access_request.create",
      "access_request.view",
      "access_request.review",
      "access_request.approve",
      "access_request.reject",
      "audit.view",
      "audit.export",
    ]],
  ],
  dataset: [
    ["View and download", ["dataset.view", "dataset.download"]],
    ["Edit and delete", ["dataset.edit", "dataset.metadata.edit", "dataset.delete"]],
    ["Files and versions", ["dataset.upload", "dataset.version.view", "dataset.version.create", "dataset.version.restore"]],
  ],
  dataset_file: [
    ["File access", ["dataset_file.view", "dataset_file.download"]],
  ],
  project: [
    ["Project access", ["project.view", "project.edit", "project.delete", "project.member.add", "project.member.remove"]],
  ],
  collection: [
    ["Collection access", ["collection.view", "collection.edit", "collection.delete"]],
  ],
};

export function groupPermissions(catalog, scope) {
  const choices = catalog.filter((permission) => permission.resource_type === scope);
  const categories = permissionCategories[scope] || [];
  const groups = categories.map(([title, codes]) => ({
    title,
    permissions: choices.filter((permission) => codes.includes(permission.code)),
  })).filter((group) => group.permissions.length);
  const knownCodes = new Set(categories.flatMap(([, codes]) => codes));
  const other = choices.filter((permission) => !knownCodes.has(permission.code));
  if (other.length) groups.push({ title: "Other", permissions: other });
  return groups;
}
