"""
Unit Tests for Template Engine Filters
======================================

Tests for custom Jinja2 filters used in template rendering.
"""

import pytest
from app.services.template_engine.filters import (
    to_snake_case,
    to_camel_case,
    to_pascal_case,
    sql_identifier_safe,
    sql_string_escape,
    sql_type_mapping,
    quote_identifier,
    indent_lines,
)


class TestToSnakeCase:
    """Tests for to_snake_case filter."""

    def test_pascal_case_conversion(self):
        assert to_snake_case("MyTableName") == "my_table_name"

    def test_already_snake_case(self):
        assert to_snake_case("already_snake") == "already_snake"

    def test_camel_case_conversion(self):
        assert to_snake_case("myTableName") == "my_table_name"

    def test_uppercase_words(self):
        assert to_snake_case("CamelCASEWord") == "camel_case_word"

    def test_single_word(self):
        assert to_snake_case("Table") == "table"

    def test_empty_string(self):
        assert to_snake_case("") == ""

    def test_with_numbers(self):
        assert to_snake_case("Table2Name") == "table2_name"


class TestToCamelCase:
    """Tests for to_camel_case filter."""

    def test_snake_case_conversion(self):
        assert to_camel_case("my_table_name") == "myTableName"

    def test_hyphenated(self):
        assert to_camel_case("already-camel") == "alreadyCamel"

    def test_pascal_case_input(self):
        assert to_camel_case("PascalCase") == "pascalcase"

    def test_empty_string(self):
        assert to_camel_case("") == ""

    def test_single_word(self):
        assert to_camel_case("word") == "word"

    def test_with_spaces(self):
        assert to_camel_case("my table name") == "myTableName"


class TestToPascalCase:
    """Tests for to_pascal_case filter."""

    def test_snake_case_conversion(self):
        assert to_pascal_case("my_table_name") == "MyTableName"

    def test_hyphenated(self):
        assert to_pascal_case("already-pascal") == "AlreadyPascal"

    def test_empty_string(self):
        assert to_pascal_case("") == ""

    def test_single_word(self):
        assert to_pascal_case("word") == "Word"

    def test_with_spaces(self):
        assert to_pascal_case("my table name") == "MyTableName"


class TestSqlIdentifierSafe:
    """Tests for sql_identifier_safe filter."""

    def test_basic_sanitization(self):
        assert sql_identifier_safe("My Table-Name!") == "my_table_name"

    def test_starts_with_number(self):
        assert sql_identifier_safe("123invalid") == "t_123invalid"

    def test_special_characters_removed(self):
        assert sql_identifier_safe("table@name#test") == "tablenametest"

    def test_empty_string(self):
        assert sql_identifier_safe("") == "unnamed"

    def test_only_special_chars(self):
        assert sql_identifier_safe("@#$%") == "unnamed"

    def test_max_length_truncation(self):
        long_name = "a" * 100
        result = sql_identifier_safe(long_name, max_length=63)
        assert len(result) == 63

    def test_already_valid(self):
        assert sql_identifier_safe("valid_name") == "valid_name"

    def test_multiple_spaces(self):
        assert sql_identifier_safe("my   table   name") == "my_table_name"


class TestSqlStringEscape:
    """Tests for sql_string_escape filter."""

    def test_single_quote_escape(self):
        assert sql_string_escape("it's a test") == "it''s a test"

    def test_multiple_quotes(self):
        assert sql_string_escape("can't won't") == "can''t won''t"

    def test_backslash_escape(self):
        assert sql_string_escape("path\\to\\file") == "path\\\\to\\\\file"

    def test_none_value(self):
        assert sql_string_escape(None) == "NULL"

    def test_no_escape_needed(self):
        assert sql_string_escape("normal text") == "normal text"


class TestSqlTypeMapping:
    """Tests for sql_type_mapping filter."""

    def test_postgresql_string(self):
        assert sql_type_mapping("str", "postgresql") == "VARCHAR(255)"

    def test_postgresql_integer(self):
        assert sql_type_mapping("int", "postgresql") == "INTEGER"

    def test_postgresql_boolean(self):
        assert sql_type_mapping("bool", "postgresql") == "BOOLEAN"

    def test_clickhouse_string(self):
        assert sql_type_mapping("str", "clickhouse") == "String"

    def test_clickhouse_integer(self):
        assert sql_type_mapping("int", "clickhouse") == "Int32"

    def test_unknown_type_passthrough(self):
        # Unknown types should be returned uppercase
        assert sql_type_mapping("custom_type", "postgresql") == "CUSTOM_TYPE"

    def test_default_database(self):
        # Should default to postgresql
        assert sql_type_mapping("uuid") == "UUID"


class TestQuoteIdentifier:
    """Tests for quote_identifier filter."""

    def test_postgresql_quoting(self):
        assert quote_identifier("my_table", "postgresql") == '"my_table"'

    def test_clickhouse_quoting(self):
        assert quote_identifier("my_table", "clickhouse") == "`my_table`"

    def test_postgresql_escape_quotes(self):
        assert quote_identifier('table"name', "postgresql") == '"table""name"'

    def test_clickhouse_escape_backticks(self):
        assert quote_identifier("table`name", "clickhouse") == "`table``name`"


class TestIndentLines:
    """Tests for indent_lines filter."""

    def test_basic_indent(self):
        text = "line1\nline2\nline3"
        result = indent_lines(text, spaces=4)
        assert result == "line1\n    line2\n    line3"

    def test_indent_first_line(self):
        text = "line1\nline2"
        result = indent_lines(text, spaces=4, first_line=True)
        assert result == "    line1\n    line2"

    def test_custom_spaces(self):
        text = "line1\nline2"
        result = indent_lines(text, spaces=2)
        assert result == "line1\n  line2"

    def test_empty_string(self):
        assert indent_lines("") == ""

    def test_single_line(self):
        assert indent_lines("single", spaces=4) == "single"
