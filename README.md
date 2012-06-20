[HMD Scheme](http://hmdscheme.herokuapp.com)
==========

About
-----
A little Scheme implementation (for certain definitions of 'Scheme') using
a form of Hindley-Milner-Damas type inference. Right now evalS kind of works,
and it passes some type checking tests. I will be further expanding this and supply
a live web demo whenever I have time. Also hopefully I'll start writing some sort
of a compiler for this in Haskell at some point.

Influences
----------
This takes a lot of influence/code-adaptation from:

* [TAPL, Benjamin Pierce](http://www.cis.upenn.edu/~bcpierce/tapl/)
* [Nathan's University](http://nathansuniversity.com/).
* [Roy/Brian McKenna](http://roy.brianmckenna.org/).
* [Robert Smallshire](http://www.smallshire.org.uk/).
* [Martin Grabm](https://github.com/wh5a/Algorithm-W-Step-By-Step).

Currently Supports
--------------
* Type infers def/defn/lambdas.
* Type infers atoms.
* Type infers basic function application.
* Type infers let and let* (thinking about removing let and just making let* let).
* Type infers non-polymorphic lists (polymorphic lists are illegal).
* Type infers pairs (but doesn't evaluate yet, still in the air about the syntax).

TODO
----
* Add better errors.
* Fix up the [web demo](http://hmdscheme.herokuapp.com).
* Add algebraic data types.
* Learn [Code Mirror](www.codemirror.net) better.
