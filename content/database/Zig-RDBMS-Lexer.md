+++
title = 'Zig RDBMS Lexer'
date = 2025-03-08T21:28:01+09:00
draft = false
+++

> Zig의 allocator와 comptime에 대한 이해를 더하기 위해, facebook의 RocksDB를 기반으로 하는 RDBMS를 구성한다.
> 가장 먼저 SQL문을 분해하고 분류하는 Lexer를 제작한다.
> 모든 코드는 https://notes.eatonphil.com/zigrocks-sql.html 레포지토리를 기반으로 하며,
> 추가적인 기능을 구현하는 내용을 포함한다.

**Ready for**

일단 가독성 및 효율성을 위한 유틸리티를 제작한다.

```zig
pub const String = []const u8;
pub const Error = String;
pub fn Result(comptime T: type) type {
    return union(enum) {
        val: T,
        err: Error,
    };
}
```

# Lexer

Lexer는 SQL문을 분석하는 도구를 말한다. SQL문장들을 Token으로 분리하는 Lexical analysis를 수행한다. 추후 이를 Parser에게 넘겨줄 수 있는 Token 배열의 형태로 만드는 일을 진행한다.

## Token 정의

기본적으로 전체 SQL 문을 해석할 때, 각 부분을 Token으로 정의한다. 다양한 유형의 Token을 정의하고 이를 기반으로 분류한다.
크게는 아래와 같은 분류가 있다.

- Keyword: `SELECT`, `CREATE_TABLE`, `INSERT`, `VALUES`, `FROM`, `WHERE`
- Operator: `+`, `=`, `<`, `||`
- Syntax: `(`, `)`, `,`
- Literals: `Identifier`, `Integer`, `String`

그리고 모든 Token은 기본적으로는 `[]u8` 을 기반으로 하기 때문에, start, end 속성을 기반으로 하여 이를 문자열로써 취급하도록 한다.

아래와 같이 유형을 분류한 Kind enum을 작성한다.

```zig
    pub const Kind = enum {
        // Keywords
        select_keyword,
        create_table_keyword,
        insert_keyword,
        values_keyword,
        from_keyword,
        where_keyword,

        // Operators
        plus_operator,
        equal_operator,
        lt_operator,
        concat_operator,

        // Other syntax
        left_paren_syntax,
        right_paren_syntax,
        comma_syntax,

        // Literals
        identifier,
        integer,
        string,
    };
```

이후에는 기본적인 `string()` 메서드와 `debug()` 메서드를 작성한다. debug 메서드의 경우 올바르게 결과값 혹은 에러를 출력하도록 돕는 기능을 한다.

```zig
    pub fn string(self: Token) String {
        return self.source[self.start..self.end];
    }

    fn debug(self: Token, msg: String) void {
        var line: usize = 0;
        var column: usize = 0;
        var lineStartIndex: usize = 0;
        var lineEndIndex: usize = 0;
        var i: usize = 0;
        var source = self.source;
        while (i < source.len) {
            if (source[i] == '\n') {
                line += 1;
                column = 0;
                lineStartIndex = i;
            } else {
                column += 1;
            }

            if (i == self.start) {
                // Find the end of the line
                lineEndIndex = i;
                while (source[lineEndIndex] != '\n') {
                    lineEndIndex += 1;
                }
                break;
            }

            i += 1;
        }

        std.debug.print("{s}\nNear line {}, column {}.\n{s}\n", .{ msg, line + 1, column, source[lineStartIndex..lineEndIndex] });
        while (column - 1 > 0) {
            std.debug.print(" ", .{});
            column -= 1;
        }

        std.debug.print("^ Near here\n\n", .{});
    }
```

또한, 각 Kind 분류에 맞는 Token을 매칭해준다.

```zig
const Builtin = struct {
    name: String,
    kind: Token.Kind,
};

var BUILTINS = [_]Builtin{
    .{ .name = "CREATE TABLE", .kind = Token.Kind.create_table_keyword },
    .{ .name = "INSERT INTO", .kind = Token.Kind.insert_keyword },
    .{ .name = "SELECT", .kind = Token.Kind.select_keyword },
    .{ .name = "VALUES", .kind = Token.Kind.values_keyword },
    .{ .name = "WHERE", .kind = Token.Kind.where_keyword },
    .{ .name = "FROM", .kind = Token.Kind.from_keyword },
    .{ .name = "||", .kind = Token.Kind.concat_operator },
    .{ .name = "=", .kind = Token.Kind.equal_operator },
    .{ .name = "+", .kind = Token.Kind.plus_operator },
    .{ .name = "<", .kind = Token.Kind.lt_operator },
    .{ .name = "(", .kind = Token.Kind.left_paren_syntax },
    .{ .name = ")", .kind = Token.Kind.right_paren_syntax },
    .{ .name = ",", .kind = Token.Kind.comma_syntax },
};
```

이외에는 단순하게 Whitespace들은 전부 정리하도록 한다.

```zig
fn eatWhitespace(source: String, index: usize) usize {
    var res = index;
    while (source[res] == ' ' or
        source[res] == '\n' or
        source[res] == '\t' or
        source[res] == '\r')
    {
        res = res + 1;
        if (res == source.len) {
            break;
        }
    }

    return res;
}
```

또한, 두 문자열에 대해 대소문자 구분으로 발생하는 에러를 해소하기 위해 ASCII 코드 기반으로 대소문자를 맞추는 함수를 작성한다.

```zig
fn asciiCaseInsensitiveEqual(left: []const u8, right: []const u8) bool {
    if (left.len != right.len) return false;

    for (left) |l, i| {
        var left_char = l;
        if (left_char >= 97 and left_char <= 122) {
            left_char = left_char - 32;
        }

        var right_char = right[i];
        if (right_char >= 97 and right_char <= 122) {
            right_char = right_char - 32;
        }

        if (left_char != right_char) {
            return false;
        }
    }

    return true;
}
```

두 문자열을 비교하여 만일 소문자인 경우 대문자로 교체하는 과정을 진행한다.

그 다음 특정 문자열을 입력으로 받아 이를 기존의 Keyword Token들과 비교하여 일치하는 토큰의 정보를 반환하도록 하는 String => Token을 수행하는 함수를 작성한다.

```zig
fn lexKeyword(source: String, index: usize) struct { nextPosition: usize, token: ?Token } {
    var longestLen: usize = 0;
    var kind = Token.Kind.select_keyword;
    for (BUILTINS) |builtin| {
        if (index + builtin.name.len >= source.len) {
            continue;
        }

        if (asciiCaseInsensitiveEqual(source[index .. index + builtin.name.len], builtin.name)) {
            longestLen = builtin.name.len;
            kind = builtin.kind;
            break;
        }
    }

    if (longestLen == 0) {
        return .{ .nextPosition = 0, .token = null };
    }

    return .{
        .nextPosition = index + longestLen,
        .token = Token{
            .source = source,
            .start = index,
            .end = index + longestLen,
            .kind = kind,
        },
    };
}
```

마찬가지로, Integer Token들에 대해서 동일한 역할을 수행하는 함수를 작성한다. 이곳에서는 각 `u8`이 정수값을 벗어날때까지 체크하도록 한다.

```zig
fn lexInteger(source: String, index: usize) struct { nextPosition: usize, token: ?Token } {
    var start = index;
    var end = index;
    var i = index;
    while (source[i] >= '0' and source[i] <= '9') {
        end = end + 1;
        i = i + 1;
    }

    if (start == end) {
        return .{ .nextPosition = 0, .token = null };
    }

    return .{
        .nextPosition = end,
        .token = Token{
            .source = source,
            .start = start,
            .end = end,
            .kind = Token.Kind.integer,
        },
    };
}
```

마찬가지로 SQL문 내부의 문자열을 확인하는 함수를 만든다. 문자열의 경우 Single quote로 구분한다.

```zig
fn lexString(source: String, index: usize) struct { nextPosition: usize, token: ?Token } {
    var i = index;
    if (source[i] != '\'') {
        return .{ .nextPosition = 0, .token = null };
    }
    i = i + 1;

    var start = i;
    var end = i;
    while (source[i] != '\'') {
        end = end + 1;
        i = i + 1;
    }

    if (source[i] == '\'') {
        i = i + 1;
    }

    if (start == end) {
        return .{ .nextPosition = 0, .token = null };
    }

    return .{
        .nextPosition = i,
        .token = Token{
            .source = source,
            .start = start,
            .end = end,
            .kind = Token.Kind.string,
        },
    };
}
```

Identifier는 뒤의 WHERE 절 등에 나오는 표현자를 말하는데, 현재 프로젝트에서는 영문자와 숫자를 뜻한다 (alphanumeric characters).

```zig
fn lexIdentifier(source: String, index: usize) struct { nextPosition: usize, token: ?Token } {
    var start = index;
    var end = index;
    var i = index;
    while ((source[i] >= 'a' and source[i] <= 'z') or
        (source[i] >= 'A' and source[i] <= 'Z') or
        (source[i] == '*'))
    {
        end = end + 1;
        i = i + 1;
    }

    if (start == end) {
        return .{ .nextPosition = 0, .token = null };
    }

    return .{
        .nextPosition = end,
        .token = Token{
            .source = source,
            .start = start,
            .end = end,
            .kind = Token.Kind.identifier,
        },
    };
}
```

이제 최종적으로 모든 요소들을 합쳐 하나의 lexer 함수를 제작한다.

```zig
pub fn lex(source: String, tokens: *std.ArrayList(Token)) ?Error {
    var i: usize = 0;
    while (true) {
        i = eatWhitespace(source, i);
        if (i >= source.len) {
            break;
        }

        const keywordRes = lexKeyword(source, i);
        if (keywordRes.token) |token| {
            tokens.append(token) catch return "Failed to allocate space for keyword token";
            i = keywordRes.nextPosition;
            continue;
        }

        const integerRes = lexInteger(source, i);
        if (integerRes.token) |token| {
            tokens.append(token) catch return "Failed to allocate space for integer token";
            i = integerRes.nextPosition;
            continue;
        }

        const stringRes = lexString(source, i);
        if (stringRes.token) |token| {
            tokens.append(token) catch return "Failed to allocate space for string token";
            i = stringRes.nextPosition;
            continue;
        }

        const identifierRes = lexIdentifier(source, i);
        if (identifierRes.token) |token| {
            tokens.append(token) catch return "Failed to allocate space for identifier token";
            i = identifierRes.nextPosition;
            continue;
        }

        if (tokens.items.len > 0) {
            debug(tokens.items, tokens.items.len - 1, "Last good token.\n");
        }

        return "Bad token";
    }

    return null;
}
```

index 끝까지 iteration을 돌리며 우선순위에 맞게 각 Token을 검증하고, 올바른 Token이 오는 경우 이를 tokens 배열에 넣어 저장한다.