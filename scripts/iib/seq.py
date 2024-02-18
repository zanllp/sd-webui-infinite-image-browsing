class Seq:
    def __init__(self, iterable):
        self.iterable = iterable

    def map(self, func):
        return Seq(func(item) for item in self.iterable)

    def filter(self, predicate):
        return Seq(item for item in self.iterable if predicate(item))

    def to_list(self):
        return list(self.iterable)

    def __iter__(self):
        return iter(self.iterable)

    def __repr__(self):
        return f"Seq({repr(self.iterable)})"

def seq(iterable):
    return Seq(iterable)