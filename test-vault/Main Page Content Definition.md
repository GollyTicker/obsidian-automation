```oa
when: mpc-begin:
become: text: "<!-- oa! mpc-begin -->"
```

```oa
when: mpc-end:
become: text: "<!-- oa! mpc-end -->"
```

```oa
when: main-page-content: here
become: text: (mpc-begin:) (mpc-end:)
```

* How do we ensure, that the start and end variables are evaluated before text is?
* We could make the pattern-match definition of text in a way, that it expects a certain type `string` for it's
  arguments. If it doesn't match, then it does not evaluate.

```oa
when: %X
matching: %X (find: text-concat:
  (text: mpc-begin: )
  (text: %currentText)
  (text: mpc-end: )
)
matching: %currentText not: mpg-def:
become: (text-concat:
  (text: mpc-begin: )
  (text: mpg-def: )
  (text: mpc-end: )
)
```

```oa
when: backticks: 
become: concat: "`" "``"
```

* My intention is to define a structure which one can detect and work on top of. The `find:` is intended to be an action
  which is done to look for such matches.
* This when-pattern should work without an explicit existing `find: ...`
* This kind of pattern matching lends itself very much to the power
  of [PROLOG (Production Prolog Video)](https://www.youtube.com/watch?v=G_eYTctGZw8).

```oa
when: mpg-def: 
become: text: (concat:
(backticks: )
"dataview\nlist from FolderA\n"
(backticks: )
)
```
