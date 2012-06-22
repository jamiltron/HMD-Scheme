if (typeof module !== 'undefined') {
    var PEG = require('pegjs');
    var fs  = require('fs');
    var parse = PEG.buildParser(fs.readFileSync('HMDScheme.peg', 'utf-8')).parse;
}

// We need to be able to generate global ids and names, and
// really this is the easiest way to go about it.
var FIRST_LOW = 97;
var LAST_LOW  = 122;
var gID       = 0;
var gName     = [FIRST_LOW];

// provide a new type name, update the global name
var fresh_name = function () {
    // provide the new name
    var name = gName.map(function (x) {
        return String.fromCharCode(x); }).join("");        

    // update the global name
    for (var i = gName.length - 1; i >= 0; i--) {
        gName[i] = gName[i] + 1;
        
        // if the current letter is going to 'roll-over'
        // set the current letter to l-case a, and then
        // carry-over an additional +1 to the next letter,
        // and append a new l-case a if we have to roll-over
        // on the last var
        if (gName[i] > LAST_LOW) {
            gName[i] = FIRST_LOW;
            if (i === 0) {
                gName.push(FIRST_LOW);
                break;
            }
        } else {
            break;
        }
    }
    return name;
};


// generate a new id for a type variable, and update the global id
var fresh_id = function () {
    var id = gID;
    gID = gID + 1;
    return id;
};

// clone an object, only focusing on properties that the object isn't
// inheriting
var clone = function(o) {
    var copy, attr;

    if (null === o || "object" != typeof o) {
        return o;
    } else {
        copy = {};
        for (attr in o) {
            if (o.hasOwnProperty(attr)) copy[attr] = o[attr];
        }
        return copy;
    }
};

// given an expression, a type environment, and a list of specifically-named
// types, generate the type of the supplied expression
var analyse = function(expr, env, specific) {
    var t1, t2, i;
    var args = [];
    var defnt, funt, argt, new_specific, new_env, next_node, result_type, ret_type;
    specific = typeof specific !== 'undefined' ? specific : {};

    // empty list
    if (typeof expr === 'object' && expr.length === 0) {
        return List(new TypeVariable());
    } else if (expr[0] === 'data') {
        // define the data type as a type operator
        defnt = new TypeOperator(expr[1], []);
        env[expr[1]] = defnt;
        // go through all of the type constructors
        for (var i = 0; i < expr[2].length; i++) {
            // create a function for each constructor
            funt = new TypeVariable();
            env[expr[2][i][0]] = funt;
            specific[funt] = true;
            args = []
            for (var j = 1; j < expr[2][i].length; j++) {
                args.push(get_type(expr[2][i][j], env, specific));
            }
            // make the constructors return type be the algebraic type
            args.push(defnt);
            result_type = new Fn(args);
            unify(funt, result_type);

            // make a convenience function for pattern-matching:
            // function name is constructor? and takes the alg dt
            // and returns whether or not it fi
        }
        return env[expr[1]];
        
    } else if (expr[0] === 'let') {
        new_env = clone(env);
        for (var i = 1; i < expr[1].length; i += 2) {
            defnt = analyse(expr[1][i], env, specific);
            new_env[expr[1][i - 1]] = defnt;
        }
        return analyse(expr[2], new_env, specific);
  
    } else if (expr[0] === 'if') {
        funt = analyse(expr[1], env, specific);
        // since the if-clause must be boolean
        unify(funt, Bool);
        defnt = analyse(expr[2], env, specific);
        argt  = analyse(expr[3], env, specific);
        unify(defnt, argt);
        return defnt;
        
        
    } else if (expr[0] === 'lambda') {
        args = [];
        new_env = clone(env);
        new_specific = clone(specific);
        for (var j = 0; j < expr[1].length; j++) {
            args.push(new TypeVariable());
            new_env[expr[1][j]] = args[j];
            new_specific[args[j]] = true;
        }
        result_type = analyse(expr[2], new_env, new_specific);
        return new Fn(args.concat(result_type));        

    } else if (expr[0] === 'def') {
        funt = new TypeVariable();
        env[expr[1]] = funt;
        specific[funt] = true;
        defnt = analyse(expr[2], env, specific);
        unify(funt, defnt);
        return defnt;

    } else if (expr[0] === 'set!') {
        if (typeof env[expr[1]] === 'undefined') {
            throw new Error("set! error");
        }
        funt = env[expr[1]];
        defnt = analyse(expr[2], env, specific);
        unify(funt, defnt);
        return defnt;

    } else if (expr[0] === 'defn') {
        args = []
        funt = new TypeVariable();
        env[expr[1]] = funt;
        specific[funt] = true;
        new_env = clone(env);
        new_specific = clone(specific);
        for (var i = 0; i < expr[2].length; i++) {
            args.push(new TypeVariable());
            new_env[expr[2][i]] = args[i];
            new_specific[args[j]] = true;
        }
        result_type = new Fn(args.concat(analyse(expr[3], new_env, new_specific)));
        unify(funt, result_type);
        return result_type;        

    } else if (expr[0] === 'let*') {
        new_env = clone(env);
        new_specific = clone(specific);
        // since the let* bindings come in pairs (i.e (let* (x 1 y 2)))
        // we need to hop over each, declare a new type variable for the i - 1
        // variable, and bound it to the inference of i
        for (var i = 0; i < expr[1].length; i+=2) {
            funt = new TypeVariable();
            new_env[expr[1][i]] = funt;
            new_specific[funt] = true;
            defnt = analyse(expr[1][i + 1], new_env, new_specific);
            unify(funt, defnt);
        }
        return analyse(expr[2], new_env, specific);

    // Dotted-pairs
    } else if (expr[0] === '.') {
        t1 = analyse(expr[1], env);
        t2 = analyse(expr[2], env);
        return Pair(t1, t2);

    // quote
    } else if (expr[0] === 'quote') {
        if (expr.length > 2) {
            throw new Error ("Quote parse error");
        }
        if (typeof expr[1] === 'string') {
            return Sym;
        } else if (typeof expr[1] === 'number') {
            return Int;
        }
        return analyse(['list'].concat(expr[1]), env, specific);
    } else if (expr[0] === 'list') { 
        if (expr.length === 1) {
            return List(new TypeVariable);
        }
        t1 = analyse(expr[1], env);
        for (var i = 2; i < expr.length; i++) {
            t2 = analyse(expr[i], env, specific);
            unify(t1, t2);
            t1 = t2;
        }
        return List(t1);
        
    // function application
    } else if (typeof expr === 'object') {
        // get the type of the calling function
        var fn_type = analyse(expr[0], env, specific);
        // back up the origi
        var bk_type = fresh(fn_type);
        args = [];
        // analyse all of the arguments
        for (var i = 1; i < expr.length; i++) {
            args.push(analyse(expr[i], env, specific));
        }
        
        // set a type variable for the return type
        result_type = new TypeVariable();
        ret_type = new Fn(args.concat(result_type));
        unify(ret_type, fn_type);
        // reset types
        env[expr[0]] = bk_type;
        return result_type;
                      
    } else {
        return get_type(expr, env, specific);
    }
};    

// if a type var is supplied, if it is an instance of another type
// return that instance, otherwise set the instance to the pruned type
// of itself. Type operators prune to themselves
var prune = function (t) {
    if (t.tag !== "TVar" && t.tag !== "TOp") {
        throw new Error("prune error");
    }
    if (t.tag === "TVar" && t.instance !== null) {
        t.instance = prune(t.instance);
        return t.instance;
    }
    return t;
};

// if a type is not a specific type
var is_generic = function (v, specific) {
    var ng;
    for (ng in specific) {
        if (ng == v) return false;
    }
    return true;
};

// lookup the type in the supplied environment, or
// return the type of an atom
var get_type = function (name, env, specific) {
    if (typeof env[name] !== 'undefined') {
        return fresh(env[name], specific);
    } else if (name === "Int" || typeof name === 'number') {
        return Int;
    } else if (name === "Bool") {
        return Bool;
    } else if (name === "Char" || (typeof name === 'string' && name[0] == "\\")) {
        return Ch;
    } else if (name === "String") {
        return Str;
    } else {
        throw new Error("Parse error");
    }
};

var build_data = function (name, env, specific) {
    if (typeof env[name] !== 'undefined') {
        return fresh(env[name], specific);
    } else if (name === "Int" || typeof name === 'number') {
        return Int;
    } else if (name === "Bool") {
        return Bool;
    } else if (name === "Char" || (typeof name === 'string' && name[0] == "\\")) {
        return Ch;
    } else if (name === "String") {
        return Str;
    } else {
        return new TypeVariable();
    }
};


  
// checks if pruned type t is v, if the pruned type is
// an operator, see if v occurs within the constructing types
var occurs_type = function (v, t) {
    var pruned_t = prune(t);
    if (pruned_t === v) {
        return true;
    } else if (pruned_t.tag === "TOp") {
        return occurs_in(v, pruned_t.types);
    }
    return false;
};

// checks if types t occurs in a list of types ts
var occurs_in = function (t, ts) {
    var i;
    for (i = 0; i < ts.length; i++) {
        if (occurs_type(t, ts[i])) {
            return true;
        }
    }
    return false;
};

// attempts to unify two types, first the type types
// are pruned and then both are type vars and do not
// occur within each others' definition, type a is set as
// an instance of b
var unify = function (t1, t2) {
    var a = prune(t1);
    var b = prune(t2);
    var i;
    
    // if a is a type var an not b, see if a needs to be
    // set as an instance of b
    if (a.tag === "TVar") {
        if (a !== b) {
            if (occurs_type(a, b)) {
                throw new Error("recursive unification");
            }
            a.instance = b;
        }
    } else if (a.tag === "TOp" && b.tag === "TVar") {
        unify(b, a);

    // if both are type operators, they must have the same name and number
    // of types, and if they do all of their constructing types must unify
    } else if (a.tag === "TOp" && b.tag === "TOp") {
        if ((a.name !== b.name) || (a.types.length !== b.types.length)) {
            throw new Error("Type mismatch");
        }
        for (i = 0; i < a.types.length; i++) {
            unify(a.types[i], b.types[i]);
        }
    } else {
        throw new Error("Cannot unify");
    }
};

// generate a fresh copy of a type given a list of specific types
var fresh = function (t, specific) {
    var mappings = {};

    var freshrec = function (tp) {
        var fresh_t = [];
        var p = prune(tp);  

        if (p.tag === "TVar") {
            // if the currectly pruned type is not specific
            if (is_generic(p, specific)) {
                // if it is not mapped, provide a mapping of a new type var
                if (typeof mappings[p] === 'undefined') {
                    mappings[p] = new TypeVariable();
                }
                // or return the supplied mapping
                return mappings[p];
            // if the pruned type is indeed specific, return it
            } else {
                return p;
            }
        /* if we have a type operator, we must generate a fresh
           type operator with fresh types for each of the copied
           operator's types */
        } else if (p.tag === "TOp") {
            for (var i = 0; i < p.types.length; i++) {
                fresh_t.push(freshrec(p.types[i]));
            }
            return new TypeOperator(p.name, fresh_t);
        }
    };

    return freshrec(t);
};               

// type vars are arbitrary types used in inference
var TypeVariable = function () {
    var name = null;
    this.tag = "TVar";
    this.id = fresh_id();
    this.instance = null;
    this.get_name = function () {
        if (name === null) {
            name = fresh_name();
            return name;
        } else {
            return name;
        }
    };
};

// An operator used to construct new types from other
// types
var TypeOperator = function (name, types) {
    this.tag  = "TOp";
    this.name = name;
    this.types = types;
};


var Fn = function (types) {
    var f = new TypeOperator("->", types);
    return f;
};

var Pair = function (p1, p2) {
    var p = new TypeOperator(".", [p1, p2]);
    return p;
};

var List      = function (x) {
    return new TypeOperator("List", [x]);
};


var t1 = new TypeVariable();
var t2 = new TypeVariable();

var Ch        = new TypeOperator("Char", []);
var Str       = List(Ch);
var Int       = new TypeOperator("Int", []);
var Bool      = new TypeOperator("Bool", []); 
var Str       = new TypeOperator("String", []); 
var Sym       = new TypeOperator("Symbol", []);
var Nil       = new TypeOperator("Nil", []);

// make inferred types look a little nicer
var pretty_print = function (result) {
    var from_str;
    if (result.tag === "TVar") {
        if (result.instance !== null) {
            return pretty_print(result.instance);
        } else {
            return result.get_name();
        }
    } else if (result.tag === "TOp") {
        if (result.name === "->" ) {
            from_str = "(" + pretty_print(result.types[0]);
            for (var i = 1; i < result.types.length; i++) {
                from_str += " -> " + pretty_print(result.types[i]);
            }
            return from_str + ")";
        } else if (result.name === "List") {
            return "(" + pretty_print(result.types[0]) + ")";
        } else if (result.name === ".") {
            return "(" + pretty_print(result.types[0]) + " . " + 
                pretty_print(result.types[1]) + ")";
        } else {
            return result.name;
        }
    } else {
        throw new Error("Pretty printing error");
    }
};
  
// run the type inference algorithm for an entire (parsed) program
var typecheck = function(p) {
    var e1 = new TypeVariable();
    var e2 = new TypeVariable();
    var e3 = new TypeVariable();
    var specific = {};
    var result = [];
    var top_env   = {'#t':   Bool, 
                     '#f':   Bool,
                     'nil':  Nil,
                     '+':    Fn([Int, Int, Int]),
                     '-':    Fn([Int, Int, Int]),
                     '*':    Fn([Int, Int, Int]),
                     '/':    Fn([Int, Int, Int]),
                     '<':    Fn([Int, Int, Bool]),
                     '>':    Fn([Int, Int, Bool]),
                     '<=':   Fn([Int, Int, Bool]),
                     '>=':   Fn([Int, Int, Bool]),
                     '=':    Fn([e1, e1, Bool]),
                     '!=':   Fn([e2, e2, Bool]),
                     'car':  Fn([List(t1), t1]),
                     'cdr':  Fn([List(t1), List(t1)]),
                     'cons': Fn([t1, List(t1), List(t1)]),
                     '!':    Fn([Int, e3, e3])};
    for (var i = 0; i < p.length; i++) {
        result.push(pretty_print(analyse(p[i], top_env, specific)));
        gName = [FIRST_LOW];
    }
    return result;
};


if (typeof module !== 'undefined') {
    module.exports.typecheck = typecheck;
}
