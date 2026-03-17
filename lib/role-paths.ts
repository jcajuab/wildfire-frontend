export const ROLE_INDEX_PATH = "/admin/roles";

export const ROLE_CREATE_PATH = `${ROLE_INDEX_PATH}/create`;

export const ROLE_EDIT_PATH_PREFIX = `${ROLE_INDEX_PATH}/edit`;

export const getRoleEditPath = (roleId: string): string =>
  `${ROLE_EDIT_PATH_PREFIX}/${roleId}`;
