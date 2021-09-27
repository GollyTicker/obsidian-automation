Atom:

```oa
some-func
```

Atom:

```oa
123
```

application without tail:

```oa
123:
```

application with single "argument":

```oa
some-func: some-arg
```

app with tail:

```oa
some-func: some-arg, another-arg
```

app with tail:

```oa
some-func: some-arg, 123, 4532
```

sequence of apps:

```oa
some-func: some-arg, 123, 4532
some-func: some-arg, 123, 4532
```

separating `,` is optional

```oa
some-func: some-arg 123 4532
some-func: some-arg 123 4532
```

`:` is right associative:

```oa
when: calc: plus, a, a
become: js-eval: something
```

parentheses can be used

```oa
when: (calc: plus), a, a
become: js-eval: something
```

parentheses enable multi-line definitions

```oa
when: (calc:
plus), a, a
when: (calc: a s ,d
plus
s
d s
)
become: js-eval: something
```

strings

```oa
when: calc: "plus", "a,dvs \nsfS32fr=W%ra"
become: js-eval: something
```

prefixing an expression with `%` turns it into an AST-interpoplation. its equivalent ot `var: `

```oa
when: calc: plus, %a, var: b
become: js-eval: %"%a + %b"
```

`%` inside AST-interpolation is registered as variable substitution

```oa
when: calc: plus, %a, %b
become: js-eval: %"%a + b"
```

```oa
associations: (a: 3, b: 5)
js-eval: %"%a + %b"
```

```oa
sequence: (when: %pattern), (become: %expr)
```