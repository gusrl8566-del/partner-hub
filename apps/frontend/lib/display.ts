export function roleLabel(role?: string | null) {
  switch (role) {
    case "ADMIN":
      return "관리자";
    case "PARTNER":
      return "파트너";
    default:
      return role ?? "-";
  }
}

export function statusLabel(status?: string | null) {
  switch (status) {
    case "PENDING":
      return "대기";
    case "ACTIVE":
      return "활성";
    case "BLOCKED":
      return "차단";
    default:
      return status ?? "-";
  }
}
