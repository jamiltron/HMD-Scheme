// Determine if an object is empty
var is_empty = function (m) {
    var k;
    for (k in m) {
        if (m.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
};

// This only takes 2 parameters until I get the
// type system more up to par.
var arithmetic = function (f, expr, env) {
    var x, y, sum, i;
    x = evalS(expr[1], env);
    y = evalS(expr[2], env);
    if (typeof x !== 'number' ||
        typeof y !== 'number') {
        throw new Error("arithmetic error");
    } else {
        sum = f(x, y);
    }
    return sum;
};

// add a binding to the supplied environment
var add_binding = function (env, v, val) {
    var bind;
    if (env.hasOwnProperty('bindings')) {
        env.bindings[v] = val;
    } else {
        bind = {};
        bind[v] = val;
        env.bindings = bind;
    }
    return 0;
};

var update = function (env, v, val) {
    if (is_empty(env)) {
        throw new Error("update error");
    } else if (env.bindings.hasOwnProperty(v)) {
        return add_binding(env, v, val);
    } else {
        return update(env.outer, v, val);
    }
};

// lookup a given v in the supplied environment
var lookup = function (env, v) {
    if (is_empty(env)) {
        return null;
    } else if (env.bindings.hasOwnProperty(v)) {
        return env.bindings[v];
    } else {
        if (env.hasOwnProperty('outer')) {
            return lookup(env.outer, v);
        } else {
            return null;
        }
    }
};    

// evaluate the given expression in the context of the given environment
var evalS = function (expr, env) {
    var res, newenv, i, bind;
    // numbers eval to themselves
    if (typeof expr === 'number') {
        return expr;
    } 

    // return #t or #f as is
    else if (expr === '#t' || expr === '#f') {
        return expr;
    }

    // strings are variable references
    else if (typeof expr === 'string') {
        return lookup(env, expr);
    }

    // look ahead
    switch (expr[0]) {
    case 'nil':
        return null;
        break;
    case '=':
        for (i = 1; i < expr.length - 1; i++) {
            if (evalS(expr[i], env) !== evalS(expr[i + 1], env)) {
                return '#f';
            }
        }
        return '#t';
        break;
    case '+':
        return arithmetic(function(x,y) { return x + y; }, expr, env);
        break;
    case '-':
        return arithmetic(function(x,y) { return x - y; }, expr, env);
        break;
    case '*':
        return arithmetic(function(x,y) { return x * y; }, expr, env);
        break;
    case '/':
        return arithmetic(function(x,y) { return x / y; }, expr, env);
        break;
    case '#<undefined>':
        throw new Error("undefined form");
        break;
    case 'def':
        if (lookup(env, expr[1]) !== null) {
            throw new Error('already defined');
        } else if (expr.length === 3) {
            add_binding(env, expr[1], 
                        evalS(expr[2], env));
        } else {
            throw new("def error");
        }
        return 0;
        break;
    case 'defn':
        if (lookup(env, expr[1]) !== null) {
            throw new Error('already defined');
        } else if (expr.length === 4) { 
            add_binding(env, expr[1], '#<undefined>');
            var l = function(args) {
                bind = {};
                for (var i = 0; i < args.length; i++) {
                    bind[expr[2][i]] = args[i];
                }
                newenv = {bindings: bind, outer: env};
                return evalS(expr[3], newenv);
            };
            update(env, expr[1], l);
        } else {
            throw new Error("defn error");
        }
        return 0;            
        break;
    case 'set!':
        if (lookup(env, expr[1]) === null) {
            throw new Error("var must be defined prior to being set");
        } else {
            update(env, expr[1], evalS(expr[2], env));
        }
        return 0;
        break;
    case 'begin':
        newenv = env;
        for (i = 1; i < expr.length; i++) {
            res = evalS(expr[i], env);
        }
        env = newenv;
        return res;
        break;
    case 'cons':
        return [evalS(expr[1],env)].concat(evalS(expr[2], env));
        break;
    case '.':
        return [".", evalS(expr[1], env), evalS(expr[2], env)];
    case 'car':
        return expr[1][0];
        break;
    case 'cdr':
        return expr[1].slice(1, expr[1].length);
        break;
    case '<':
        if (evalS(expr[1], env) < evalS(expr[2], env)) {
            return '#t';
        }
        return '#f';
        break;
    case '>':
        if (evalS(expr[1], env) > evalS(expr[2], env)) {
            return '#t';
        }
        return '#f';
        break;
    case '<=':
        if (evalS(expr[1], env) <= evalS(expr[2], env)) {
            return '#t';
        }
        return '#f';
        break;
    case '>=':
        if (evalS(expr[1], env) >= evalS(expr[2], env)) {
            return '#t';
        }
        return '#f';
        break;
    case '!=':
        if (evalS(expr[1], env) !== evalS(expr[2], env)) {
            return '#t';
        }
        return '#f';
        break;
    case 'if':
        if (evalS(expr[1], env) === '#t') {
            return evalS(expr[2], env);
        }
        return evalS(expr[3], env);
        break;
    case 'quote':
        return expr[1];
        break;
    case 'let-one':
        bind = {};
        bind[expr[1]] = evalS(expr[2], env);
        newenv = {bindings: bind, outer: env};
        return evalS(expr[3], newenv);
    case 'let':
        bind = {};
        if (expr[1].length % 2 !== 0) {
            throw new ("Let binding arity error");
        }
        for (var i = 0; i < expr[1].length; i += 2) {
            bind[expr[1][i]] = evalS(expr[1][i + 1], 
                                          env);
        }
        newenv = {bindings: bind, outer: env};
        return evalS(expr[2], newenv);
    case 'let*':
        bind = {};
        if (expr[1].length % 2 !== 0) {
            throw new ("Let binding arity error");
        }
        newenv = env;
        for (var i = 0; i < expr[1].length; i += 2) {
            bind[expr[1][i]] = evalS(expr[1][i + 1], 
                                          newenv);
            newenv = {bindings: bind, outer: env};
        }

        return evalS(expr[2], newenv);
    case 'lambda':
        return function(args) {
            bind = {};
            for (var i = 0; i < args.length; i++) {
                bind[expr[1][i]] = args[i];
            }
            newenv = {bindings: bind, outer: env};
            return evalS(expr[2], newenv);
        };
        break;
    // function application
    default:
        return lookup(env, expr[0])(expr.slice(1).map(function (x) { return evalS(x, env); }));
    }
};

if (typeof module !== 'undefined') {
    module.exports.evalS = evalS;
}
