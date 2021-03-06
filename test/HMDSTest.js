if (typeof module !== 'undefined') {
    var assert     = require('chai').assert;
    var PEG        = require('pegjs');
    var fs         = require('fs');
    var evalS = require('../interpreter').evalS;
    var parse      = PEG.buildParser(fs.readFileSync('HMDScheme.peg', 'utf-8')).parse;
    var typecheck  = require('../inference').typecheck;
} else {
    // In browser assume loaded by <script>
    var parse  = HMDScheme.parse;
    var assert = chai.assert;
}

suite('Atoms and lists:\t', function() {
    test('a number', function() {
        assert.deepEqual(
            evalS(3, {}),
            3
        );
    });
    test('a boolean', function() {
        assert.deepEqual(
            evalS('#t', {}),
            '#t'
        );
    });
    test('nil', function() {
        assert.deepEqual(
            evalS('nil', {}),
            null
        );
    });
    test('empty list', function () {
        assert.deepEqual(
            evalS(['list'], {}),
            []
        );
    });
    test('a list', function() {
        assert.deepEqual(
            evalS(['list', 1, 2, 3], {}),
            [1, 2, 3]
        );
    });
    test('a char', function() {
        assert.deepEqual(
            evalS("\\c", {}),
            "\\c"
        );
    });
});

suite('Dotted pairs:\t', function () {
    test('basic dotted pair', function () {
        assert.deepEqual(
            evalS(['.', 1, 2], {}),
            ['.', 1, 2]
        );
    });
});

suite('Data types:\t', function () {
    test('basic data type', function () {
        assert.deepEqual(
            evalS(['data', 'datum', [['dd', 'Int']]], {}),
            0
        );
    });
    test('multiple constructors', function () {
        assert.deepEqual(
            evalS(['data', 'datum', [['di', 'Int'], ['dc', 'Char']]], {}),
            0
        );
    });
    test('constructing a data type', function () {
        assert.deepEqual(
            evalS(['begin', ['data', 'datum', [['di', 'Int'], ['dc', 'Char']]],
                   ['di',2]], {}),
            ['di', 2]
        );
    });
    test('constructing a data type 2', function () {
        assert.deepEqual(
            evalS(['begin', ['data', 'datum', [['di', 'Int'], ['dc', 'Char']]],
                   ['dc','\\c']], {}),
            ['dc', '\\c']
        );
    });
    test('constructing a data type 3', function () {
        assert.deepEqual(
            evalS(['begin', ['data', 'datum', [['di', 'Int', 'Bool', 'Char'], ['dc', 'Char']]],
                   ['di', 1, '#t','\\c']], {}),
            ['di', 1, '#t', '\\c']
        );
    });
});

suite('Quote:\t', function() {
    test('a number', function() {
        assert.deepEqual(
            evalS(['quote', 3], {}),
            3
        );
    });
    test('an atom', function() {
        assert.deepEqual(
            evalS(['quote', 'dog'], {}),
            'dog'
        );
    });
    test('a list', function() {
        assert.deepEqual(
            evalS(['quote', [1,2,3]], {}),
            [1,2,3]
        );
    });
    test('a char', function() {
       assert.deepEqual(
           evalS(['quote', '\\c'], {}),
           '\\c'
        );
    }); 
    test('a string', function() {
        assert.deepEqual(
            evalS(['quote', ['\\c', '\\a', '\\t']], {}),
            ['\\c', '\\a', '\\t']
        );
    });
});

suite('Def:\t', function() {
    test('define a variable', function() {
        assert.deepEqual(
            evalS(['def', 'x', 42], {}),
            0
        );
    });
    test('ensure a defined variable is bound', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'x', 42], 'x'], {}),
            42
        );
    });
    test('defining a defined var should throw an error', function() {
        assert.throws(function () {
            evalS(['def', 'x', 42], {bindings: {'x': 42}, outer: {}});
        });
    });
});

suite('Set:\t', function() {
    test('set a defined variable', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'x', 42], ['set!', 'x', 0]], {}),
            0
        );
    });
    test('setting an undefined var should error', function() {
        assert.throws(function () {
            evalS(['set!', 'x', 42], {});
        });
    });
});

suite('Math:\t', function() {
    test('add two numbers', function() {
        assert.deepEqual(
            evalS(['+', 41, 1], {}),
            42
        );
    });
    test('add a number and a variable', function() {
       assert.deepEqual(
           evalS(['begin', ['def', 'x', 38], ['+', 'x', 4]], {}),
            42
        );
    }); 
    test('adding a number and an unbound var should throw an error', function() {
        assert.throws(function () {
            evalS(['+', 'x', 42], {});
        });
    });

    test('subtract two numbers', function() {
        assert.deepEqual(
            evalS(['-', 43, 1], {}),
            42
        );
    });
    test('subtract a number and a variable', function() {
       assert.deepEqual(
           evalS(['begin', ['def', 'x', 80], ['-', 'x', 38]], {}),
            42
        );
    }); 
    test('multiply two numbers', function() {
        assert.deepEqual(
            evalS(['*', 21, 2], {}),
            42
        );
    });
    test('multiply a number and a variable', function() {
       assert.deepEqual(
           evalS(['begin', ['def', 'x', 6], ['*', 'x', 4]], {}),
            24
        );
    }); 
    test('divide two numbers', function() {
        assert.deepEqual(
            evalS(['/', 24, 2], {}),
            12
        );
    });
    test('divide a number and a variable', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'x', 6], ['/', 'x', 3]], {}),
            2
        );
    }); 
    test('do all types of math', function() {
        assert.deepEqual(
            evalS(['+', ['*', ['-', 6,4 ], 2], ['/', 32, 4]], {}),
            12
        );
    });
    test('<', function() {
        assert.deepEqual(
            evalS(['<', 4, 7], {}),
            '#t'
        );
    }); 
    test('equality true', function() {
        assert.deepEqual(
            evalS(['=', 5, 5], {}),
            '#t'
        );
    });
    test('equality false', function() {
        assert.deepEqual(
            evalS(['=', 5, 4], {}),
            '#f'
        );
    });
    test('list equality', function() {
        assert.deepEqual(
            evalS(['=', ['list', 1,2,3], ['list', 1,2,3]], {}),
            "#t"
        );
    });
    test('list equality 2', function() {
        assert.deepEqual(
            evalS(['=', ['quote', [1,2,3]], ['quote', [3,2,1]]], {}),
            "#f"
        );
    });

    test('list of list equality', function() {
        assert.deepEqual(
            evalS(['=', ['list', ['quote', [1,2]], ['quote', [5,6]]],
                   ['list', ['quote', [1,2]], ['quote', [5,6]]]], {}),
            "#t"
        );
    });
    test('list of list equality', function() {
        assert.deepEqual(
            evalS(['=', ['list', ['quote', [1,2]], ['quote', [5,6]]],
                   ['list', ['quote', [1,2]], ['quote', [6,5]]]], {}),
            "#f"
        );
    });
    test('inequality false', function() {
        assert.deepEqual(
            evalS(['!=', 5, 5], {}),
            '#f'
        );
    });
    test('inequality true', function() {
        assert.deepEqual(
            evalS(['!=', 5, 4], {}),
            '#t'
        );
    });
    test('list inequality', function() {
        assert.deepEqual(
            evalS(['!=', ['list', 1, 2, 3], ['list', 1, 2, 3]], {}),
            '#f'
        );
    });
    test('list inequality 2', function() {
        assert.deepEqual(
            evalS(['!=', ['list', 1, 2, 3], ['list', 1, 2, 1]], {}),
            '#t'
        );
    });
    test('list of list inequality', function() {
        assert.deepEqual(
            evalS(['!=', ['list', ['quote', [1,2]], ['quote', [5,6]]],
                   ['list', ['quote', [1,2]], ['quote', [5,6]]]], {}),
            "#f"
        );
    });
    test('list of list inequality', function() {
        assert.deepEqual(
            evalS(['!=', ['list', ['quote', [1,2]], ['quote', [5,6]]],
                   ['list', ['quote', [1,2]], ['quote', [6,5]]]], {}),
            "#t"
        );
    });
});

suite('If:\t\t', function() {
    test('true evaluates the first statement', function() {
        assert.deepEqual(
            evalS(['if', ['=', 4, 4], '#f', '#t'], {}),
            '#f'
        );
    });
    test('test that false evaluates the second statement', function() {
        assert.deepEqual(
            evalS(['if', ['=', 4, 6], '#f', '#t'], {}),
            '#t'
        );
    });
});    

suite('Cons:\t', function() {
    test('cons a num onto a list', function() {
        assert.deepEqual(
            evalS(['cons', 3, ['list', 4,5,6]], {}),
            [3,4,5,6]
        );
    });
    test('cons a char onto a string', function() {
        assert.deepEqual(
            evalS(['cons', '\\c',['list', '\\a', '\\t']], {}),
            ['\\c', '\\a', '\\t']
        );
    });
});

suite('Car:\t', function() {
    test('car the value from a list', function() {
        assert.deepEqual(
            evalS(['car', ['list', 4,5,6]], {}),
            4
        );
    });
    test('car the value from a string', function() {
        assert.deepEqual(
            evalS(['car', ['list', '\\d', '\\o', '\\g']], {}),
            '\\d'
        );
    });
});

suite('Cdr:\t', function() {
    test('cdr the rest of a list', function() {
        assert.deepEqual(
            evalS(['cdr', ['list', 4,5,6]], {}),
            [5,6]
        );
    });
    test('cdr multiple values from a list', function() {
        assert.deepEqual(
            evalS(['cdr',['cdr',['cdr', ['list', 3,4,5,6]]]], {}),
            [6]
        );
    });
});

suite('Let-one:\t', function() {
    test('ensure binding', function() {
        assert.deepEqual(
            evalS(['let-one', 'x', 2, ['+', 40, 'x']], {}),
            42
        );
    });
});

suite('Let:\t', function() {
    test('ensure single binding', function() {
        assert.deepEqual(
            evalS(['let', ['x', 4], 'x'], {}),
            4
        );
    });
    test('ensure multiple bindings', function() {
        assert.deepEqual(
            evalS(['let', ['x', 4, 'y', ['+', 1, 1]], ['+', 'x', 'y']], {}),
            6
        );
    });
});

suite('Let*:\t', function() {
    test('ensure multiple bindings', function() {
        assert.deepEqual(
            evalS(['let*', ['x', 4, 'y', 'x'], ['+', 'x', 'y']], {}),
            8
        );
    });
});

suite('Lambda:\t', function() {
    test('ensure declaration', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'a', ['lambda', ['x'], ['+', 2, 'x']]]], {}),
            0
        );
    });
    test('lambda one argument', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'a', ['lambda', ['x'], ['+', 2, 'x']]], ['a', 2]], {}),
            4
        );
    });
    test('lambda several arguments', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'a', ['lambda', ['x', 'y', 'z'], ['*', 'x', ['*', 'y', 'z']]]], ['a', ['+', 0, 1], 2, 3]], {}),
            6
        );
    });
    test('lambda several arguments through defn', function() {
        assert.deepEqual(
            evalS(['begin', ['defn', 'a', ['x', 'y', 'z'], ['*', 'x', ['*', 'y', 'z']]], ['a', 1, 2, 3]], {}),
            6
        );
    });
    test('recursive lambda via def', function() {
        assert.deepEqual(
            evalS(['begin', ['def', 'fact', ['lambda', ['n'], 
                                             ['if', ['=', 'n', 0], 1, 
                                              ['*', 'n', 
                                               ['fact', ['-', 'n', 1]]]]]], ['fact', 3]], {}),
            6
        );
    });
    test('recursive lambda via defn', function() {
        assert.deepEqual(
            evalS(['begin', ['defn', 'fact', ['n'], 
                             ['if', ['=', 'n', 0], 1, 
                              ['*', 'n', 
                               ['fact', ['-', 'n', 1]]]]], ['fact', 3]], {}),
            6
        );
    });
});

suite('Typecheck atoms:\t', function() {
    test('4 :: Int', function() {
        assert.deepEqual(
            typecheck([4])[0],
            'Int'
        );
    });
    test('#t :: Bool', function() {
        assert.deepEqual(
            typecheck(['#t'])[0],
            'Bool'
        );
    });
    test('#f :: Bool', function() {
        assert.deepEqual(
            typecheck(['#f'])[0],
            'Bool'
        );
    });
    test("'\\c' :: Char", function() {
        assert.deepEqual(
            typecheck(['\\c'])[0],
            'Char'
        );
    });
});    


suite('Typecheck lists:\t', function() {
    test("'() :: (Nil)", function() {
        assert.deepEqual(
            typecheck([['quote', []]])[0],
            '(a)'
        );
    });
    test('(list 4 5 6) :: (Int)', function() {
        assert.deepEqual(
            typecheck([['list', 4, 5, 6]])[0],
            '(Int)'
        );
    });
    test('(list #t #f #t) :: (Bool)', function() {
        assert.deepEqual(
            typecheck([['list', '#t', '#f', '#t']])[0],
            '(Bool)'
        );
    });
    test('(list "\\c" "\\a" "\\t") :: (Char)', function() {
        assert.deepEqual(
            typecheck([['list', "\\c", "\\a", "\\t"]])[0],
            '(Char)'
        );
    }); 
    test('(list 1 #t "\\c") :: Error', function() {
        assert.throws(function () {
            typecheck([['list', 1, '#t', "\\c"]]);
        });
    });
    test('(list (list 1 2) (list 3 4)) :: ((Int))', function() {
        assert.deepEqual(
            typecheck([['list', ['list', 1, 2], ['list', 3, 4]]])[0],
            '((Int))'
        );
    }); 
    test('(list (list 1 2) (list 3 4)) :: ((Int))', function() {
        assert.deepEqual(
            typecheck([['list', ['list', 1, 2], ['list', 3, 4]]])[0],
            '((Int))'
        );
    }); 
    test('(list (list (list #t) (list #f)) (list (list #f) (list #t))) :: (((Bool)))', function() {
        assert.deepEqual(
            typecheck([['list', ['list', ['list', '#t'], ['list', '#f']],
                        ['list', ['list', '#f'], ['list', '#t']]]])[0],
            '(((Bool)))'
        );
    }); 
    test('(list)', function() {
        assert.deepEqual(
            typecheck([['list']])[0],
            '(a)'
        );
    }); 
});

suite('Typecheck cons:\t', function() {
    test("(cons 2 '()) :: (Int)", function() {
        assert.deepEqual(
            typecheck([['cons', 2, ['quote', []]]])[0],
            '(Int)'
        );
    });
    test("(cons 2 '(1)) :: (Int)", function() {
        assert.deepEqual(
            typecheck([['cons', 2, ['quote', [1]]]])[0],
            '(Int)'
        );
    });
});

suite('Typecheck functions:', function() {
    test('+  :: (Int -> Int -> Int)', function() {
        assert.deepEqual(
            typecheck(['+'])[0],
            '(Int -> Int -> Int)'
        );
    });
    test('-  :: (Int -> Int -> Int)', function() {
        assert.deepEqual(
            typecheck(['-'])[0],
            '(Int -> Int -> Int)'
        );
    });
    test('*  :: (Int -> Int -> Int)', function() {
        assert.deepEqual(
            typecheck(['*'])[0],
            '(Int -> Int -> Int)'
        );
    });
    test('/  :: (Int -> Int -> Int)', function() {
        assert.deepEqual(
            typecheck(['/'])[0],
            '(Int -> Int -> Int)'
        );
    });
    test('<  :: (Int -> Int -> Bool)', function() {
        assert.deepEqual(
            typecheck(['<'])[0],
            '(Int -> Int -> Bool)'
        );
    });
    test('>  :: (Int -> Int -> Bool)', function() {
        assert.deepEqual(
            typecheck(['>'])[0],
            '(Int -> Int -> Bool)'
        );
    });
    test('<= :: (Int -> Int -> Bool)', function() {
        assert.deepEqual(
            typecheck(['<='])[0],
            '(Int -> Int -> Bool)'
        );
    });
    test('>= :: (Int -> Int -> Bool)', function() {
        assert.deepEqual(
            typecheck(['>='])[0],
            '(Int -> Int -> Bool)'
        );
    });
    test('!= :: (a -> a -> Bool)', function() {
        assert.deepEqual(
            typecheck(['!='])[0],
            '(a -> a -> Bool)'
        );
    });
    test('=  :: (a -> a -> Bool)', function() {
        assert.deepEqual(
            typecheck(['='])[0],
            '(a -> a -> Bool)'
        );
    });
});    


suite('Typecheck basic math application:', function() {
    test('(+ 2 3)  :: Int', function() {
        assert.deepEqual(
            typecheck([['+', 2, 3]])[0],
            'Int'
        );
    });
    test('(+ 2 (- 3 2))  :: Int', function() {
        assert.deepEqual(
            typecheck([['+', 2, ['-', 3, 2]]])[0],
            'Int'
        );
    });
    test('(+ 1 #t) :: Error', function() {
        assert.throws(function () {
            typecheck([['+', 1, '#t']]);
        });
    });
});

suite('Typecheck lambda:', function() {
    test('(lambda (x) x) :: (a -> a)', function() {
        assert.deepEqual(
            typecheck([['lambda', ['x'], 'x']])[0],
            '(a -> a)'
        );
    });
    test('(lambda (x y) y)  :: (a -> b -> b)', function() {
        assert.deepEqual(
            typecheck([['lambda', ['x', 'y'], 'y']])[0],
            '(a -> b -> b)'
        );
    });
    test('(lambda (x y z w) z)  :: (a -> b -> c -> d -> c)', function() {
        assert.deepEqual(
            typecheck([['lambda', ['x', 'y', 'z', 'w'], 'z']])[0],
            '(a -> b -> c -> d -> c)'
        );
    });
    test('(lambda (x) (+ x 2)) :: (Int -> Int)', function() {
        assert.deepEqual(
            typecheck([['lambda', ['x'], ['+', 'x', 2]]])[0],
            '(Int -> Int)'
        );
    });
    test('((lambda (x) (+ x 2)) 2) :: Int', function() {
        assert.deepEqual(
            typecheck([[['lambda', ['x'], ['+', 'x', 2]], 2]])[0],
            'Int'
        );
    });
});

suite('Typecheck defn:', function() {
    test('(defn a (x) x)', function() {
        assert.deepEqual(
            typecheck([['defn', 'a', ['x'], 'x']])[0],
            '(a -> a)'
        );
    });
    test('(defn a (x y) y)  :: (a -> b -> b)', function() {
        assert.deepEqual(
            typecheck([['defn', 'a', ['x', 'y'], 'y']])[0],
            '(a -> b -> b)'
        );
    });
    test('(defn a (x y z w) z)  :: (a -> b -> c -> d -> c)', function() {
        assert.deepEqual(
            typecheck([['defn', 'a', ['x', 'y', 'z', 'w'], 'z']])[0],
            '(a -> b -> c -> d -> c)'
        );
    });
    test('(defn a (x) (+ x 2)) :: (Int -> Int)', function() {
        assert.deepEqual(
            typecheck([['defn', 'a', ['x'], ['+', 'x', 2]]])[0],
            '(Int -> Int)'
        );
    });
});

suite('Typecheck def:', function() {
    test('(def a 1)', function() {
        assert.deepEqual(
            typecheck([['def', 'a', 1]])[0],
            'Int'
        );
    });
    test('(def a #t)', function() {
        assert.deepEqual(
            typecheck([['def', 'a', '#t']])[0],
            'Bool'
        );
    });
    test('(def a <)', function() {
        assert.deepEqual(
            typecheck([['def', 'a', '<']])[0],
            '(Int -> Int -> Bool)'
        );
    });
    test('(def a (lambda (x y) x))', function() {
        assert.deepEqual(
            typecheck([['def', 'a', ['lambda', ['x', 'y'], 'x']]])[0],
            '(a -> b -> a)'
        );
    });
});

suite('Typecheck let:', function () {
    test('(let (x 1) x) :: Int', function() {
        assert.deepEqual(
            typecheck([['let', ['x', 1], 'x']])[0],
            'Int'
        );
    });
    test('(let (x 1 y #t) y):: Bool', function() {
        assert.deepEqual(
            typecheck([['let', ['x', 1, 'y', '#t'], 'y']])[0],
            'Bool'
        );
    });
});

suite('Typecheck let*:', function () {
    test('(let* (x 1 y x) x) :: Int', function() {
        assert.deepEqual(
            typecheck([['let*', ['x', 1, 'y', 'x'], 'x']])[0],
            'Int'
        );
    });
    test('(let* (x 2 y (< 3 x)) y):: Bool', function() {
        assert.deepEqual(
            typecheck([['let*', ['x', 2, 'y', ['<', 3, 'x']], 'y']])[0],
            'Bool'
        );
    });
});

suite('Typecheck if:', function () {
    test('(if #t 1 2)', function() {
        assert.deepEqual(
            typecheck([['if', '#t', 1, 2]])[0],
            'Int'
        );
    });
    test('(if (> 1 0) 1 0)', function () {
       assert.deepEqual(
           typecheck([['if', ['>', 1, 0], 1, 2]])[0],
            'Int'
        );
    }); 
    test('(if #t #f #t)', function() {
        assert.deepEqual(
            typecheck([['if', '#t', '#f', '#t']])[0],
            'Bool'
        );
    });
    test('non-boolean if-clause should throw an error', function() {
        assert.throws(function () {
            typecheck([['if', 1, '#t', '#f']]);
        });
    });
    test('incongruent return types should throw an error', function() {
        assert.throws(function () {
            typecheck([['if', '#f', '#t', 1]]);
        });
    });
});

suite('Typecheck def + lambda:', function () {
    test('(def a (lambda (x) x)) :: (a -> a)', function() {
        assert.deepEqual(
            typecheck([['def', 'a', ['lambda', ['x'], 'x']]])[0],
            '(a -> a)'
        );
    });
    test('(def inc (lambda (x) (+ 1 x))) :: (Int -> Int)', function() {
        assert.deepEqual(
            typecheck([['def', 'inc', ['lambda', ['x'], ['+', 1, 'x']]]])[0],
            '(Int -> Int)'
        );
    });
    test('(def gt3 (lambda (x) (if (> x 3) 1 0))) :: (Int -> Int)', function() {
        assert.deepEqual(
            typecheck([['def', 'gt3', ['lambda', ['x'], ['if', ['>', 'x', 3], 1, 0]]]])[0],
            '(Int -> Int)'
        );
    });
    test('(def mk-addr (lambda (x) (lambda (y) (+ x y)))) :: (Int -> (Int -> Int))', function() {
        assert.deepEqual(
            typecheck([['def', 'mk-addr', ['lambda', ['x'],
                                           ['lambda', ['y'], ['+', 'x', 'y']]]]])[0],
            '(Int -> (Int -> Int))'
        );
    });
});

suite('Typecheck data:\t', function() {
    test('(data datum ((da Int))) :: datum', function() {
        assert.deepEqual(
            typecheck([['data', 'datum', [['da', 'Int']]]])[0],
            'datum'
        );
    });
    test('da :: Int -> datum', function() {
        assert.deepEqual(
            typecheck([['data', 'datum', [['da', 'Int']]],'da'])[1],
            '(Int -> datum)'
        );
    });
    test('(da 1) :: datum', function() {
        assert.deepEqual(
            typecheck([['data', 'datum', [['da', 'Int']]], ['da',1]])[1],
            'datum'
        );
    });
    test('a more complex data type', function() {
        assert.deepEqual(
            typecheck([['data', 'datum', [['da', 'Int', 'Bool'], ['dc', 'Char']]], 'da'])[1],
            '(Int -> Bool -> datum)'
        );
    });
    test('a more complex data type 2', function() {
        assert.deepEqual(
            typecheck([['data', 'datum', [['da', 'Int', 'Bool'], ['dc', 'Char']]], 'dc'])[1],
            '(Char -> datum)'
        );
    });
    test('a more complex data type constructed', function() {
        assert.deepEqual(
            typecheck([['data', 'datum', [['da', 'Int', 'Bool'], ['dc', 'Char']]], ['da', 1, '#t']])[1],
            'datum'
        );
    });
    test('incongruent types should throw an error', function() {
        assert.throws(function () {
            typecheck([['data', 'datum', [['da', 'Int', 'Bool'], ['dc', 'Char']]], ['da', 1, 2]])
        });
    });
    test('incorrect # of args to a constructor should throw an error', function() {
        assert.throws(function () {
            typecheck([['data', 'datum', [['da', 'Int', 'Bool'], ['dc', 'Char']]], ['da', 1]])
        });
    });
    test('incorrect # of args to a constructor should throw an error 2', function() {
        assert.throws(function () {
            typecheck([['data', 'datum', [['da', 'Int', 'Bool'], ['dc', 'Char']]], ['da', 1, '#t', 2]])
        });
    });
    test('polymorphic data types', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a'], [['da', 'a']]]])[0],
            'datum a'
        );
    });
    test('polymorphic data types constructor', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a'], [['da', 'a']]], 'da'])[1],
            '(a -> datum a)'
        );
    });
    test('polymorphic data types constructed', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a'], [['da', 'a']]], ['da', 1]])[1],
            'datum Int'
        );
    });
    test('polymorphic data types 2', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a', 'b'], [['da', 'a'], ['db', 'b']]]])[0],
            'datum a b'
        );
    });
    test('polymorphic data types constructor 2b', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a', 'b'], [['da', 'a'], ['db', 'b']]], 'da'])[1],
            '(a -> datum a b)'
        );
    });
    test('polymorphic data types constructor 2b', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a', 'b'], [['da', 'a'], ['db', 'b']]], 'db'])[1],
            '(b -> datum a b)'
        );
    });
    test('polymorphic data types constructed 2a', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a', 'b'], [['da', 'a'], ['db', 'b']]], ['da', 1]])[1],
            'datum Int b'
        );
    });
    test('polymorphic data types constructed 2b', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a', 'b'], [['da', 'a'], ['db', 'b']]], ['db', '#t']])[1],
            'datum a Bool'
        );
    });
    test('polymorphic data types constructed 3', function() {
        assert.deepEqual(
            typecheck([['data', ['datum', 'a', 'b'], [['da', 'a'], ['db', 'b'], ['dc', 'a', 'b']]], ['dc', '#t', '\\c']])[1],
            'datum Bool Char'
        );
    });
});

suite('(data int-tree ((node int-tree int-tree) (leaf Int))):', function() {
    test('declaration :: int-tree', function() {
        assert.deepEqual(
            typecheck([['data', 'int-tree', [['node', 'int-tree', 'int-tree'], ['leaf', 'Int']]]])[0],
            'int-tree'
        );
    });
    test('node :: (int-tree -> int-tree -> int-tree)', function() {
        assert.deepEqual(
            typecheck([['data', 'int-tree', [['node', 'int-tree', 'int-tree'], ['leaf', 'Int']]], 'node'])[1],
            '(int-tree -> int-tree -> int-tree)'
        );
    });
    test('leaf :: (Int -> int-tree)', function() {
        assert.deepEqual(
            typecheck([['data', 'int-tree', [['node', 'int-tree', 'int-tree'], ['leaf', 'Int']]], 'leaf'])[1],
            '(Int -> int-tree)'
        );
    });
    test('(leaf 2) :: int-tree)', function() {
        assert.deepEqual(
            typecheck([['data', 'int-tree', [['node', 'int-tree', 'int-tree'], ['leaf', 'Int']]], ['leaf', 2]])[1],
            'int-tree'
        );
    });
    test('(node (leaf 2) (leaf 3)) :: int-tree)', function() {
        assert.deepEqual(
            typecheck([['data', 'int-tree', [['node', 'int-tree', 'int-tree'], ['leaf', 'Int']]], ['node', ['leaf', 2], ['leaf', 3]]])[1],
            'int-tree'
        );
    });
    test('(node (node (leaf 1) (leaf 2)) (leaf 3)) :: int-tree)', function() {
        assert.deepEqual(
            typecheck([['data', 'int-tree', [['node', 'int-tree', 'int-tree'], ['leaf', 'Int']]], ['node', ['node', ['leaf', 1], ['leaf', 2]], ['leaf', 3]]])[1],
            'int-tree'
        );
    });
});

suite('Typecheck !:', function () {
    test('! :: (Int -> a -> a)', function() {
        assert.deepEqual(
            typecheck(['!'])[0],
            '(Int -> a -> a)'
        );
    });
});