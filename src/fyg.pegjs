// ENTRYPOINT
program "program"
  = _nl module_dec _ (nl _nl top_level_expr _)* _nl

// UTILS
ws = [ \t] 
nl = [\n\r]
onl = nl*
comment = "/*" (!"*/" .)* "*/"

// arbitrary whitespace (no nl)
_ = (ws / comment)*

// artibrary whitespace (with nl)
_nl = (ws / comment / nl)*

// mandatory whitespace (no nl)
__ = ws+ _

// MODULES
module_dec "module delcaration"
  = "module" __ module_name:module_name { return module_name }

module_name
  = module_name_part ("." module_name_part)*

module_name_part
  = name_part:[A-Z][a-zA-Z0-9]+ { return name_part.join("") }

top_level_expr
  = expr

const_dec
  = "const" __ value_iden _nl "=" _nl expr

// VALUE EXPR
expr
  = additive_expr

additive_expr
  = left:multiplicative_expr _nl "+" _nl right:additive_expr
  / left:multiplicative_expr _nl "-" _nl right:additive_expr
  / multiplicative_expr

multiplicative_expr
  = left:primary_expr _nl "*" _nl right:multiplicative_expr
  / left:primary_expr _nl "/" _nl right:multiplicative_expr 
  / primary_expr

primary_expr
  = const_dec
  / object_expr
  / array_expr
  / value_iden
  / integer
  / string
  / "(" additive:additive_expr ")" 

object_expr
  = "{" _nl object_member (_nl "," _nl object_member _nl ",")* _nl "}"
  / "{" _nl "}"

object_member
  = value_iden _ ":" _ expr

array_expr
  = "[" _nl (expr _nl "," _nl)+ _nl "]"
  / "[" _nl expr? _nl "]"

integer "simple number"
  = digits:[0-9]+ 

string
  = "`" content:(string_content / escaped_backtick)* "`" 

string_content
  = [^\`\\]+ // Matches any character except backticks or backslashes

escaped_backtick
  = "\\\`"

value_iden "value identifier"
  = [a-z][a-zA-Z0-9_]+
