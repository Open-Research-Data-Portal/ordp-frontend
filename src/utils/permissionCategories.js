export const permissionCategories = {
  platform: [
    ["Dataset publishing", ["dataset.create"]],
    ["Users and permission management", ["user.view", "user.manage", "user.permission.grant", "user.permission.revoke"]],
    ["Groups", ["group.create", "group.edit", "group.delete", "group.member.manage", "group.permission.manage"]],
    ["Requests and audit", ["access_request.review", "audit.view"]],
  ],
  dataset: [
    ["View and download", ["dataset.view", "dataset.download"]],
    ["Edit and delete", ["dataset.edit", "dataset.metadata.edit", "dataset.delete"]],
    ["Files and versions", ["dataset.upload", "dataset.version.view", "dataset.version.create", "dataset.version.restore"]],
    ["Review", ["dataset.approve"]],
  ],
};

export function groupPermissions(catalog, scope) {
  const choices = catalog.filter((permission) => permission.resource_type === scope);
  const groups = permissionCategories[scope].map(([title, codes]) => ({
    title, permissions: choices.filter((permission) => codes.includes(permission.code)),
  })).filter((group) => group.permissions.length);
  const knownCodes = new Set(permissionCategories[scope].flatMap(([, codes]) => codes));
  const other = choices.filter((permission) => !knownCodes.has(permission.code));
  if (other.length) groups.push({ title: "Other", permissions: other });
  return groups;
}
