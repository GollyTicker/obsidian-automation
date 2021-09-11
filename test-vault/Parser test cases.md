```oa
some-func
```

```oa
some-func: some-arg, 123, 4532
```

```oa
some-func: some-arg, 123, 4532
some-func: some-arg, 123, 4532
```

```oa
when: calc: plus, %a, %b
become: js-eval %"%a + %b"
```

```oa
associations: (a: 3, b: 5)
js-eval %"%a + %b"
```

```oa
sequence: (when: %pattern), (become: %expr)
```