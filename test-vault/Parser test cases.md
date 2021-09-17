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

`:` is right associative:
```oa
when: calc: plus, a, a
become: js-eval: something
```

```oa
when: calc: plus, %a, %b
become: js-eval: %"%a + %b"
```

```oa
associations: (a: 3, b: 5)
js-eval: %"%a + %b"
```

```oa
sequence: (when: %pattern), (become: %expr)
```