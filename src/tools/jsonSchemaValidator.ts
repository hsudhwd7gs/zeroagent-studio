// JSON Schema Validator — validate input against a JSON Schema.
// Uses ajv-style syntax (subset). Returns {valid, errors} as JSON.

export interface JsonSchemaConfig {
  schema?: string // JSON Schema string
}

interface ValidationError {
  path: string
  message: string
}

export function runJsonSchemaValidator(input: string, config: JsonSchemaConfig = {}): string {
  let value: unknown
  try {
    value = JSON.parse(input)
  } catch {
    return JSON.stringify({ valid: false, errors: [{ path: '$', message: 'Input is not valid JSON' }] })
  }

  let schema: Record<string, unknown>
  try {
    schema = JSON.parse(config.schema || '{}')
  } catch {
    return JSON.stringify({ valid: false, errors: [{ path: '$', message: 'Schema is not valid JSON' }] })
  }

  const errors: ValidationError[] = []
  validate(value, schema, '$', errors)

  return JSON.stringify({ valid: errors.length === 0, errors }, null, 2)
}

function validate(
  value: unknown,
  schema: Record<string, unknown>,
  path: string,
  errors: ValidationError[]
): void {
  // type
  const type = schema.type as string | string[] | undefined
  if (type) {
    const types = Array.isArray(type) ? type : [type]
    const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
    if (!types.includes(actual)) {
      errors.push({ path, message: `expected ${types.join('|')}, got ${actual}` })
      return
    }
  }

  // enum
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push({ path, message: `value not in enum: ${JSON.stringify(schema.enum)}` })
  }

  // const
  if ('const' in schema && value !== schema.const) {
    errors.push({ path, message: `expected const ${JSON.stringify(schema.const)}` })
  }

  // String constraints
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push({ path, message: `string too short (min ${schema.minLength})` })
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      errors.push({ path, message: `string too long (max ${schema.maxLength})` })
    }
    if (typeof schema.pattern === 'string') {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          errors.push({ path, message: `string does not match pattern ${schema.pattern}` })
        }
      } catch {
        // invalid regex — skip
      }
    }
  }

  // Number constraints
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push({ path, message: `value ${value} < minimum ${schema.minimum}` })
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push({ path, message: `value ${value} > maximum ${schema.maximum}` })
    }
    if (typeof schema.multipleOf === 'number' && value % schema.multipleOf !== 0) {
      errors.push({ path, message: `value not multiple of ${schema.multipleOf}` })
    }
  }

  // Array constraints
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push({ path, message: `array too short (min ${schema.minItems})` })
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      errors.push({ path, message: `array too long (max ${schema.maxItems})` })
    }
    if (schema.items && typeof schema.items === 'object') {
      value.forEach((item, i) => {
        validate(item, schema.items as Record<string, unknown>, `${path}[${i}]`, errors)
      })
    }
  }

  // Object constraints
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if (schema.required && Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in obj)) {
          errors.push({ path: `${path}.${key}`, message: `missing required property` })
        }
      }
    }
    if (schema.properties && typeof schema.properties === 'object') {
      const props = schema.properties as Record<string, Record<string, unknown>>
      for (const [key, subSchema] of Object.entries(props)) {
        if (key in obj) {
          validate(obj[key], subSchema, `${path}.${key}`, errors)
        }
      }
    }
    if (typeof schema.additionalProperties === 'boolean' && schema.additionalProperties === false) {
      const allowed = schema.properties ? Object.keys(schema.properties as object) : []
      for (const key of Object.keys(obj)) {
        if (!allowed.includes(key)) {
          errors.push({ path: `${path}.${key}`, message: `additional property not allowed` })
        }
      }
    }
  }
}
