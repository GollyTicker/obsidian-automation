```
when: mpc-begin:
bcomes: text: "<!-- oa! mpc-begin -->"
```

```
when: mpc-end:
bcomes: text: "<!-- oa! mpc-end -->"
```

```
when: main-page-content: here
become: text: (mpc-begin:) (mpc-end:)
```

* How do we ensure, that the start and end variables are evaluated before text is?
* We could make the pattern-match definition of text in a way, that it expects a certain type `string` for it's
  arguments. If it doesn't match, then it does not evaluate.

```
when: %X
matching: %X (find: text-concat:
  (text: mpc-begin: )
  (text: %currentText)
  (text: mpc-begin: )
)
matching: %currentText (mpg-def: )
become: %(text-concat:
  (text: mpc-begin: )
  (text: mpg-def: )
  (text: mpc-end: )
)
```

* My intention is to define a structure which one can detect and work on top of. The `find:` is intended to be an action
  which is done to look for such matches.
* This when-pattern should work without an explicit existing `find: ...`
* This kind of pattern matching lends itself very much to the power
  of [PROLOG (Production Prolog Video)](https://www.youtube.com/watch?v=G_eYTctGZw8).

```
when: mpg-def: 
become: (text-raw-with: =
=```dataview
list from FolderA
```=
)
```
