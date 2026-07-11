function textFromError(error: unknown) {
  const anyError = error as any
  const raw = anyError?.response?.data?.reason
    || anyError?.response?.data?.error
    || anyError?.message
    || (typeof error === 'string' ? error : '')
  return String(raw || '').trim()
}

function hasChinese(value: string) {
  return /[\u4e00-\u9fff]/.test(value)
}

export function rawErrorMessage(error: unknown) {
  return textFromError(error)
}

type ErrorLanguage = 'zh' | 'en'

function text(language: ErrorLanguage, zh: string, en: string) {
  return language === 'en' ? en : zh
}

export function friendlyError(error: unknown, fallback = '操作失败，请稍后重试。', language: ErrorLanguage = 'zh') {
  const raw = textFromError(error)
  if (!raw) return fallback
  if (hasChinese(raw)) return raw

  const lower = raw.toLowerCase()
  if (lower.includes('network error') || lower.includes('failed to fetch')) return text(language, '网络连接失败，请检查服务是否正在运行。', 'Network request failed. Please check whether the service is running.')
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('canceled')) return text(language, '请求超时或已取消，请稍后重试。', 'The request timed out or was canceled. Please try again.')
  if (lower.includes('login required') || lower.includes('unauthorized') || lower.includes('401')) return text(language, '需要登录后才能继续操作。', 'Please sign in before continuing.')
  if (lower.includes('forbidden') || lower.includes('not authorized') || lower.includes('403')) return text(language, '当前账号没有执行该操作的权限。', 'This account does not have permission for that action.')
  if (lower.includes('not found') || lower.includes('404')) return text(language, '没有找到对应记录，可能已被删除或尚未同步。', 'The requested record was not found or has not synced yet.')
  if (lower.includes('not configured') || lower.includes('disabled') || lower.includes('credentials') || lower.includes('api_key') || lower.includes('api key') || lower.includes('requires ai_enrichment')) return text(language, '相关服务尚未配置，当前入口暂不可用。', 'This service is not configured yet.')
  if (lower.includes('quota') || lower.includes('limit exceeded')) return text(language, '当前额度不足或已达到使用上限。', 'The current quota or usage limit has been reached.')
  if (lower.includes('invalid enum value') || lower.includes('unrecognized key') || lower.includes('invalid')) return text(language, '提交参数不符合要求，请检查输入后重试。', 'Some submitted fields are invalid. Please check the input and try again.')
  if (lower.includes('is required') || lower.includes('body is required') || lower.includes('required')) return text(language, '缺少必填信息，请补充后重试。', 'Required information is missing. Please complete the form and try again.')
  if (lower.includes('at most') || lower.includes('less than or equal')) return text(language, '输入数量或数值超出允许范围。', 'The input is outside the allowed range.')
  if (lower.includes('database') || lower.includes('sqlite') || lower.includes('insert failed')) return text(language, '数据库操作失败，请稍后重试或联系管理员。', 'The database operation failed. Please try again later or contact an administrator.')
  if (lower.includes('returned empty result')) return text(language, '外部来源没有返回可用结果，请换一个关键词或稍后重试。', 'The external source returned no usable result. Try another query or retry later.')
  if (lower.includes('request failed with status code')) return fallback
  return fallback
}
