/**
 * Pre-defined dbt test types for pickers and configuration.
 */

export interface TestTypeDefinition {
  name: string
  description: string
  category: 'schema' | 'data' | 'freshness'
  requiresColumn: boolean
  hasConfig: boolean
}

export const BUILT_IN_TESTS: TestTypeDefinition[] = [
  {
    name: 'unique',
    description: 'Ensures all values in a column are unique',
    category: 'schema',
    requiresColumn: true,
    hasConfig: false,
  },
  {
    name: 'not_null',
    description: 'Ensures no NULL values in a column',
    category: 'schema',
    requiresColumn: true,
    hasConfig: false,
  },
  {
    name: 'accepted_values',
    description: 'Ensures values are within an allowed list',
    category: 'schema',
    requiresColumn: true,
    hasConfig: true,
  },
  {
    name: 'relationships',
    description: 'Ensures referential integrity to another model',
    category: 'schema',
    requiresColumn: true,
    hasConfig: true,
  },
]

export const DBT_EXPECTATIONS_TESTS: TestTypeDefinition[] = [
  {
    name: 'expect_column_values_to_be_between',
    description: 'Values fall within a range',
    category: 'data',
    requiresColumn: true,
    hasConfig: true,
  },
  {
    name: 'expect_column_values_to_match_regex',
    description: 'Values match a regex pattern',
    category: 'data',
    requiresColumn: true,
    hasConfig: true,
  },
  {
    name: 'expect_column_value_lengths_to_be_between',
    description: 'String lengths within a range',
    category: 'data',
    requiresColumn: true,
    hasConfig: true,
  },
  {
    name: 'expect_column_values_to_be_of_type',
    description: 'Values conform to expected data type',
    category: 'data',
    requiresColumn: true,
    hasConfig: true,
  },
  {
    name: 'expect_table_row_count_to_be_between',
    description: 'Table row count within a range',
    category: 'data',
    requiresColumn: false,
    hasConfig: true,
  },
]

export const ALL_TESTS = [...BUILT_IN_TESTS, ...DBT_EXPECTATIONS_TESTS]
