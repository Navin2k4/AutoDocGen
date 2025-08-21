import ast
import json
import sys

class FunctionVisitor(ast.NodeVisitor):
    def __init__(self):
        self.functions = []

    def visit_FunctionDef(self, node):
        params = []
        for arg in node.args.args:
            param_type = None
            if arg.annotation:
                param_type = ast.unparse(arg.annotation)
            params.append({
                "name": arg.arg,
                "type": param_type
            })

        return_type = None
        if node.returns:
            return_type = ast.unparse(node.returns)

        func_body = ast.get_source_segment(self.source_code, node)

        self.functions.append({
            "name": node.name,
            "params": params,
            "returnType": return_type,
            "startIndex": node.lineno,
            "endIndex": node.end_lineno,
            "body": func_body.strip(),
            "language": "python"
        })

    def parse(self, source_code):
        self.source_code = source_code
        tree = ast.parse(source_code)
        self.visit(tree)
        return self.functions

if __name__ == "__main__":
    source = sys.stdin.read()
    visitor = FunctionVisitor()
    result = visitor.parse(source)
    print(json.dumps(result))
