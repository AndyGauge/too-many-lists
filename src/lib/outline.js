// Learn Rust With Entirely Too Many Linked Lists — chaptered.
// Source: https://rust-unofficial.github.io/too-many-lists/  (Alexis Beingessner / Gankra)
//
// Each section carries its `chapterId`. Group consecutive same-id sections and
// the chapters fall out — no separate tree to maintain.

const raw = [
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "chapterIntro": "We build the worst version of a singly-linked stack first, on purpose. Every wall we hit teaches a piece of Rust we'll keep using.",
    "editionNotes": [
      {
        "edition": "2021",
        "body": "The original was written against Rust 2018. If you `cargo new` today, you'll get a project pinned to a newer edition. For this chapter the difference is mostly invisible — `Box`, `mem::replace`, `match`, and `#[test]` behave the same. The 2021 prelude added `TryInto`/`TryFrom`/`FromIterator`, which we don't use yet."
      },
      {
        "edition": "2024",
        "body": "On Rust 2024 (`edition = \"2024\"` in Cargo.toml), some lifetime-elision edge cases are stricter and `if let` temporaries drop earlier. None of that triggers in this chapter; you'll see real edition deltas when we get to iterators (Chapter 2) and the production deque (Chapter 6)."
      }
    ],
    "title": "Layout",
    "gesture": {
      "systems": "A linked list is one node pointing at the next, so the type is recursive. In C you'd write `struct Node { int v; struct Node* next; }` and never think twice. In Rust the obvious translation does not compile, and the reason is the entire point of the chapter.",
      "dynamic": "A linked list is a chain — each link holds a value and a reference to the next link. In Python every variable is already a reference, so you never name the indirection. In Rust the indirection is a thing you spell, and that's what makes this hard at first.",
      "beginner": "A linked list is a chain. Each link in the chain holds one value plus a small note that says where the next link is. In most languages this is easy. In Rust, the obvious way to write it down does not compile — and the reason is the heart of what makes Rust different."
    },
    "steps": [
      {
        "prose": {
          "systems": "First instinct: an enum that's either empty or a node containing a value and the rest of the list. It mirrors the C struct one-to-one. The compiler has a problem with it.",
          "dynamic": "Rust has a tagged union called `enum`. Each variant can carry data. We say a list is either empty, or a node with a value plus another list. That sounds tautological — and that's exactly why the compiler complains.",
          "beginner": "A type in Rust is a shape: it tells the program how to lay a value out in memory. Our first try says \"a list is either nothing, or a link with a value followed by another list.\" It seems clear. The compiler hates it."
        },
        "code": "pub enum List {\n    Empty,\n    More(Node),\n}\n\nstruct Node {\n    elem: i32,\n    next: List,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The error: the type has infinite size. C lets you do this because `Node*` is one pointer wide regardless of what it points at. Rust stores the variant inline, so `More(Node)` would have to embed another `List` directly inside itself, which embeds another, and so on. The size of `List` is the size of `List` plus a bit. The compiler refuses to solve that equation.",
          "dynamic": "Why does this fail? In Python everything you type is secretly a pointer to a heap object, so a class can hold a reference to another instance of itself with no fuss. Rust is different: a value sits where you put it, and the compiler computes its size up front. A `List` that contains a `List` inside one of its variants is bigger than itself. Recursion in the type needs an indirection — a pointer to the heap — to break the loop.",
          "beginner": "The compiler refuses because it cannot figure out how many bytes a list takes. If a list contains another list inside it, that list contains another list, and so on forever. Rust needs the size up front, before any list exists. It is asking for an \"indirection\" — somewhere to put the rest of the list out of line."
        },
        "code": "error[E0072]: recursive type `List` has infinite size\n  --> src/lib.rs:1:1\n   |\n1  | pub enum List {\n   | ^^^^^^^^^^^^^\n2  |     Empty,\n3  |     More(Node),\n   |          ---- recursive without indirection"
      },
      {
        "prose": {
          "systems": "`Box<T>` is the heap allocation. It owns one `T` on the heap and is a single pointer at runtime. Drop a `Box`, the heap memory is freed. Wrap the recursive part in `Box<Node>` and the size collapses to one pointer.",
          "dynamic": "`Box<T>` is how you say \"put this on the heap, give me a handle\". The handle is small (one pointer). Crucially the `Box` *owns* the heap memory — when the box is dropped, the memory is freed. There's no garbage collector deciding when to clean up; ownership decides.",
          "beginner": "`Box<T>` is exactly that. The \"heap\" is a pool of memory the program asks for while it runs; a `Box<T>` puts a value on the heap and gives you back a small note (the size of one address) that says where it lives. When the note is thrown away, the heap memory is freed automatically. Now the size of a list is fixed: a tag plus one address."
        },
        "code": "pub enum List {\n    Empty,\n    More(Box<Node>),\n}\n\nstruct Node {\n    elem: i32,\n    next: List,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "It compiles, but the layout is sloppy. `List::Empty` is a valid value of `List`, which means an empty list still costs an enum tag plus padding. Worse, `Node`'s `next` field can itself be empty, so we're paying for the empty-case representation at every link. We can fix that by hiding the recursion behind a private alias and a wrapper struct.",
          "dynamic": "It works — but every node in the list now carries enum bookkeeping for the case where it's the end of the list. That's wasted bytes per node and a little CPU at every step. We can split the public face of the list (the wrapper) from the per-node tail (a private alias). The wrapper holds the public API; the alias is the recursive part.",
          "beginner": "It compiles, but every link still carries enum bookkeeping even when it is the last link in the chain. We can hide the recursive part as a private `Link` type and put a clean public `List` type around it that is just \"a thing with a head.\" This is the layout we keep."
        },
        "code": "pub struct List {\n    head: Link,\n}\n\n// private to the module — readers don't see this\nenum Link {\n    Empty,\n    More(Box<Node>),\n}\n\nstruct Node {\n    elem: i32,\n    next: Link,\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Recursive types in Rust need an indirection (`Box<T>`) because layout is computed up front, not deferred to a pointer. Hide the recursion behind a private `Link` enum so the public `List` is just a head pointer.",
      "dynamic": "Rust needs you to spell the indirection. Use `Box<T>` to put the next node on the heap; wrap a private `Link` enum in a public `List` struct so users see one type, not the recursive plumbing.",
      "beginner": "Rust must know how big a value is up front. A list that contains a list needs an \"indirection\" — `Box<T>` puts the next link on the heap and gives you a small fixed-size note that says where it is."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-layout.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "New",
    "gesture": {
      "systems": "A type without methods is a record, not an interface. We attach methods through `impl` blocks. The first one is a constructor.",
      "dynamic": "Rust separates the data (`struct`) from the behavior (`impl`). You define a struct, then write an `impl` block that hangs methods off of it. There is no `__init__` — by convention you write a function called `new` that returns an instance.",
      "beginner": "A type by itself is just a record of fields; it has no behavior. Behavior is attached separately, in an `impl` block. The first piece of behavior we want is a way to make a fresh, empty list."
    },
    "steps": [
      {
        "prose": {
          "systems": "Methods live in `impl List { ... }`. A function with no `self` is an associated function — call it as `List::new()`, the same way you'd call a static method.",
          "dynamic": "Methods on the type itself (no instance) are called `Type::name()`. Methods on instances take a `self` parameter. `new` here has no `self`, so it's a constructor — it builds and returns a fresh `List`.",
          "beginner": "Methods live inside `impl List { ... }`. A method that takes no instance is a \"constructor\" by convention. We name it `new`, return a fresh value of the type, and callers reach it as `List::new()` — the double-colon means \"look up `new` on the `List` type itself.\""
        },
        "code": "impl List {\n    pub fn new() -> Self {\n        List { head: Link::Empty }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Self` (capital S) is shorthand for the type the `impl` block is on. Use it everywhere instead of repeating `List`; renaming the type later only touches the line `pub struct List` and not the constructor.",
          "dynamic": "`Self` is just a name for \"the type we're defining methods on\". You'll see it constantly. Always prefer it to spelling the type out — it makes refactoring painless.",
          "beginner": "`Self` (with a capital S) means \"the type this `impl` block is for.\" Use it everywhere instead of writing `List` again. If we ever rename the type, only the line that introduces it has to change."
        },
        "code": "let list = List::new();\n// list.head is Link::Empty"
      }
    ],
    "tldr": {
      "systems": "Constructors are conventional, not built-in: write a function called `new` inside an `impl` block, return `Self`. Callers use `Type::new()`.",
      "dynamic": "Constructors are conventional, not built-in: write a function called `new` inside an `impl` block, return `Self`. Callers use `Type::new()`.",
      "beginner": "Rust separates data from behavior. A constructor is just a function called `new` inside an `impl` block — call it as `Type::new()`."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-new.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "Ownership 101",
    "gesture": {
      "systems": "Before we can write `push` and `pop` we have to talk about three kinds of `self`. This is the part of Rust where it stops looking like C++. References here are not `T*` — they're a checked relationship between a borrower and a value that the compiler tracks.",
      "dynamic": "Rust has no GC. To make that safe, every value has exactly one owner; when the owner goes out of scope, the value is freed. To use a value without owning it, you *borrow* a reference. Methods declare which of these they want via the `self` parameter.",
      "beginner": "Before we can write `push` and `pop`, we need to talk about ownership — the single most important idea in Rust. Every value in a Rust program has exactly one owner; when the owner goes away, so does the value. Methods say what kind of access they need to a value through the `self` parameter, and there are three flavors."
    },
    "steps": [
      {
        "prose": {
          "systems": "`self` (no ref) consumes the receiver — like a value parameter that takes ownership. After the call, the caller no longer has the value. Use this for methods that intentionally destroy or transform the receiver.",
          "dynamic": "`self` by value moves the receiver into the method. After you call it, the variable on the outside is gone — the compiler will reject any later use. Think of it as \"this method consumes the object.\"",
          "beginner": "`self` (no symbols) means \"this method takes ownership of the value.\" After the call, the caller no longer has it — the value has been used up. This is for methods that intentionally consume the receiver, like a `destroy` method or a builder finalizer."
        },
        "code": "impl List {\n    fn destroy(self) { /* self is owned, dropped at end */ }\n}\n\nlet list = List::new();\nlist.destroy();\n// list.destroy();   // error: value used after move"
      },
      {
        "prose": {
          "systems": "`&mut self` is an exclusive borrow — for the duration of the call, no other reference to the value exists. This is the strict mutable-reference form. It's what you use for `push`, `pop`, `clear`, anything that mutates.",
          "dynamic": "`&mut self` is a borrow that grants permission to mutate. Rust enforces that only one mutable reference can exist at a time, which is how it prevents the data races a GC language would tolerate. Most mutating methods take `&mut self`.",
          "beginner": "`&mut self` means \"I need temporary, exclusive access to change the value.\" While the method runs, no other part of the program can read or write this value. That sounds restrictive — and that's exactly what makes Rust safe without a garbage collector. Methods like `push`, `pop`, and `clear` use this."
        },
        "code": "impl List {\n    fn clear(&mut self) { self.head = Link::Empty; }\n}\n\nlet mut list = List::new();\nlist.clear();    // ok\nlist.clear();    // ok again — borrow ended at semicolon"
      },
      {
        "prose": {
          "systems": "`&self` is a shared borrow — read-only, can coexist with other shared borrows but not with `&mut`. Use this for accessors and queries.",
          "dynamic": "`&self` is a read-only borrow. Many shared borrows can exist at once, as long as no mutable borrow overlaps with them. Use it for getters and anything that doesn't change the value.",
          "beginner": "`&self` means \"I need to look at the value, not change it.\" Many bits of the program can hold this kind of read-only handle at once, as long as nobody is also asking for `&mut`. Use this for accessors and questions like \"is this empty?\""
        },
        "code": "impl List {\n    fn is_empty(&self) -> bool {\n        matches!(self.head, Link::Empty)\n    }\n}"
      }
    ],
    "tldr": {
      "systems": "Three receivers: `self` consumes, `&mut self` borrows exclusively, `&self` borrows shared. The compiler enforces aliasing rules — no overlap between mut and shared borrows.",
      "dynamic": "Methods declare what they need from the receiver: take ownership (`self`), mutate temporarily (`&mut self`), or just read (`&self`). Pick the least powerful one that does the job.",
      "beginner": "Three flavors of `self`: `self` consumes the value, `&mut self` borrows it exclusively to change it, `&self` borrows it shared to read it. The compiler keeps track of which is which."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-ownership.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "Push",
    "gesture": {
      "systems": "Pushing onto the front: allocate a new node, point its `next` at the current head, swing the head pointer to the new node. Two lines of C. In Rust the borrow checker has notes.",
      "dynamic": "To push, we need a new node whose `next` is the *current* list, then make `self.head` point at the new node. The interesting part is the middle move — Rust will not let us simply read `self.head` out of a borrowed reference.",
      "beginner": "Pushing onto the front means adding a new link, pointing it at whatever the current head was, and making the list's head point at the new link. In most languages this is two short lines. In Rust the compiler will not let you do those two lines as written, and the reason is worth understanding."
    },
    "steps": [
      {
        "prose": {
          "systems": "First attempt is the C translation. The compiler refuses: you cannot move out of `self.head` while you only hold a `&mut self`.",
          "dynamic": "The naive version reads `self.head` to put it in the new node's `next`. But you only borrowed `self` — you don't own its insides. Moving out would leave `self.head` invalid for an instant, and the compiler refuses to let that happen.",
          "beginner": "The first attempt looks reasonable. We make a new link whose `next` is `self.head`, then set `self.head` to point at the new link. The compiler refuses, saying we cannot move `self.head` out of a borrowed reference. We only have temporary access to `self`; we do not own its insides."
        },
        "code": "pub fn push(&mut self, elem: i32) {\n    let new_node = Box::new(Node {\n        elem,\n        next: self.head,   // error: cannot move out of borrowed content\n    });\n    self.head = Link::More(new_node);\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The classic move-out problem in safe Rust. The fix is `std::mem::replace`: it takes a `&mut T` and a replacement value, swaps them in place, and hands the old value back to you by value. The location is never invalid.",
          "dynamic": "`std::mem::replace` is the tool: it swaps the value at a mutable reference for a placeholder, returning the old value. The slot is always valid — there is no in-between moment. Now we can take the old head, build a node with it as `next`, and put a new head in.",
          "beginner": "The fix is `mem::replace`. Given a mutable reference to a value plus a replacement, it swaps them in place and hands the old value back to you. The slot is never empty, never invalid — there is no in-between state. We swap the head out for an empty placeholder, build the new link using the old head as `next`, then put the new head in."
        },
        "code": "use std::mem;\n\npub fn push(&mut self, elem: i32) {\n    let new_node = Box::new(Node {\n        elem,\n        next: mem::replace(&mut self.head, Link::Empty),\n    });\n    self.head = Link::More(new_node);\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Compiles. Costs one allocation per push (the `Box::new`). The temporary `Link::Empty` is a single tag write — basically free. Notice we never wrote `unsafe`.",
          "dynamic": "It compiles. Every push allocates exactly one node on the heap (`Box::new`) and rewires two fields. No garbage collector, no manual `free`, and we never wrote `unsafe` — the compiler verified the whole thing.",
          "beginner": "The whole thing compiles. Every push allocates exactly one link on the heap. There is no garbage collector deciding when to clean up later, and we never wrote `unsafe` — the compiler verified that the pointers and the swaps all line up."
        },
        "code": "let mut list = List::new();\nlist.push(1);\nlist.push(2);\nlist.push(3);\n// head -> 3 -> 2 -> 1 -> Empty",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "You can't move out of a `&mut` reference. `mem::replace` swaps a placeholder in atomically and hands you the old value, which is the canonical way to move-then-replace through a borrow.",
      "dynamic": "You can't move out of a `&mut` reference. `mem::replace` swaps a placeholder in atomically and hands you the old value, which is the canonical way to move-then-replace through a borrow.",
      "beginner": "You cannot move a value out of a `&mut` reference. `mem::replace` swaps in a placeholder and hands back the old value, which is the canonical way to pull a value out through a borrow."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-push.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "Pop",
    "gesture": {
      "systems": "Pop is push run backwards: take the head node, hand the caller its element, splice the rest of the list back into `self.head`. The empty case has to return *something*, which is what `Option<T>` is for.",
      "dynamic": "`pop` removes and returns the front element — but the list might be empty. Rust does not have `null`. Instead it has `Option<T>`, an enum with `Some(T)` and `None`. Anything that might or might not have a value uses it.",
      "beginner": "Pop removes the front link and returns its value — but the list might be empty. Other languages return `null` or raise an exception in that case. Rust does neither; it has a type called `Option<T>` that means \"maybe a value, maybe not,\" and you have to handle both cases explicitly."
    },
    "steps": [
      {
        "prose": {
          "systems": "First instinct: `match &self.head`. Empty → return `None`. More → return the element. The catch: `&self.head` is a borrow, which prevents you from also assigning to `self.head` inside the same arm.",
          "dynamic": "Pattern-match on the head. Empty branch returns `None`. The \"more\" branch needs to take the value out and update `self.head`. But matching on `&self.head` borrows it — you can't reassign it while that borrow is live.",
          "beginner": "The first instinct is to look at `self.head` and decide what to return. Empty case: return `None` (the \"no value\" half of `Option`). Other case: return the link's value as `Some(value)`. The catch: looking at `self.head` borrows it, and that borrow blocks us from also reassigning it inside the same code path."
        },
        "code": "pub fn pop(&mut self) -> Option<i32> {\n    match &self.head {\n        Link::Empty => None,\n        Link::More(node) => {\n            // we want node.elem AND to set self.head = node.next,\n            // but the borrow on self.head is still live — won't compile.\n            Some(node.elem)\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Same trick as push: `mem::replace` to take the head out by value, leaving `Link::Empty` behind. Now we own the old head and can disassemble it without fighting borrows.",
          "dynamic": "Same fix as push: pull the head out using `mem::replace`. We get ownership of the old `Link`, leaving an empty placeholder behind. Now there's no borrow in flight, and we can freely rewire `self.head`.",
          "beginner": "Same trick as push. Use `mem::replace` to take the head out by value, leaving an empty placeholder behind. Now we own the old head and can take it apart however we want — pull the value out, point `self.head` at the rest of the chain, and return."
        },
        "code": "use std::mem;\n\npub fn pop(&mut self) -> Option<i32> {\n    match mem::replace(&mut self.head, Link::Empty) {\n        Link::Empty => None,\n        Link::More(node) => {\n            self.head = node.next;\n            Some(node.elem)\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "When `node` falls out of scope at the end of the arm, the `Box<Node>` is dropped and the heap allocation is freed. The element was already moved out into the return value, so there's no double-free or leak.",
          "dynamic": "When the arm ends, `node` goes out of scope. The `Box<Node>` is dropped, which frees the node's memory. The element was already copied (it's an `i32`) into the return value, so the caller still has it. Compare this to Python, where reference-counting decides when memory goes away — here the *scope* decides.",
          "beginner": "When the matched link variable goes out of scope at the end of the code path, its `Box` is automatically dropped and the heap memory is freed. The value inside has already been moved into the return — no double-free, no leak. The compiler tracks all of this for you."
        },
        "code": "let mut list = List::new();\nlist.push(1);\nlist.push(2);\nassert_eq!(list.pop(), Some(2));\nassert_eq!(list.pop(), Some(1));\nassert_eq!(list.pop(), None);",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`Option<T>` replaces nullable returns. `mem::replace` again to take the head out by value; pattern-match it; rewire `self.head`. The popped node's `Box` drops at end of arm — no leak, no double-free.",
      "dynamic": "No `null` in Rust — use `Option<T>` (`Some` or `None`) for \"maybe a value\". Take the head out, match it, rebuild `self.head` from the tail. The freed node's memory goes away when its scope ends; the compiler tracks this.",
      "beginner": "Rust has no `null`. Use `Option<T>` for \"maybe a value.\" `mem::replace` takes the head out, you match on it, return the value, and the link's heap memory is freed when it falls out of scope."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-pop.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "Testing",
    "gesture": {
      "systems": "Tests live in the same file as the code they exercise, gated behind `#[cfg(test)]` so they vanish from release builds. `cargo test` finds them, compiles them, runs them, prints results. No separate harness, no CMake variant, no fixture wiring.",
      "dynamic": "Rust ships a unit test runner in the language. You write a function annotated with `#[test]`; you run `cargo test`; you get pass/fail output. There is no pytest or rspec to install.",
      "beginner": "Tests live in the same file as the code they exercise. There is no test runner to install, no fixture file to wire up. You annotate a function with `#[test]`, you run `cargo test`, you get pass/fail output. That is the whole story."
    },
    "steps": [
      {
        "prose": {
          "systems": "A test module sits in the same file. `#[cfg(test)]` strips it from non-test builds. `use super::*` pulls the parent module's items into scope so the test can name the type without re-importing.",
          "dynamic": "Tests live in a `mod tests` block at the bottom of the file. `#[cfg(test)]` means \"only include this when building tests.\" `use super::*` makes everything from the surrounding module available inside the test functions.",
          "beginner": "A test module sits at the bottom of the file inside a `mod tests { ... }` block. The line above it, `#[cfg(test)]`, tells Rust to only include the block when building tests — your shipping binary doesn't carry test code. `use super::*;` pulls everything from the surrounding file into the test module so tests can name your types directly."
        },
        "code": "#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn basics() {\n        let mut list = List::new();\n        assert_eq!(list.pop(), None);\n\n        list.push(1);\n        list.push(2);\n        list.push(3);\n        assert_eq!(list.pop(), Some(3));\n        assert_eq!(list.pop(), Some(2));\n\n        list.push(4);\n        list.push(5);\n        assert_eq!(list.pop(), Some(5));\n        assert_eq!(list.pop(), Some(4));\n        assert_eq!(list.pop(), Some(1));\n        assert_eq!(list.pop(), None);\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`cargo test` runs every `#[test]` in parallel by default. Each test gets its own thread; failures don't cross-contaminate. `--nocapture` if you want to see `println!` from passing tests.",
          "dynamic": "Run `cargo test` and Rust will compile and run every test in parallel. Output is captured per-test; only failures print. Add `--nocapture` to see `println!` from passing tests, useful while developing.",
          "beginner": "Run `cargo test` and Rust compiles every test, runs them in parallel (each test in its own thread), and prints a summary. Failures show full output; passes are quiet by default. This is the standard tooling for every Rust project, no setup required."
        },
        "code": "$ cargo test\n   Compiling lists v0.1.0\n    Finished test [unoptimized + debuginfo] target(s) in 0.42s\n     Running unittests src/lib.rs\n\nrunning 1 test\ntest first::tests::basics ... ok\n\ntest result: ok. 1 passed; 0 failed"
      }
    ],
    "tldr": {
      "systems": "Tests are first-class: `#[test]` on a function inside a `#[cfg(test)] mod tests` block, then `cargo test`. No external runner, no fixture wiring.",
      "dynamic": "Tests are first-class: `#[test]` on a function inside a `#[cfg(test)] mod tests` block, then `cargo test`. No external runner, no fixture wiring.",
      "beginner": "Tests are first-class. `#[test]` on a function inside a `#[cfg(test)] mod tests` block, then `cargo test`. No external runner, no fixture wiring."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-test.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "Drop",
    "gesture": {
      "systems": "Rust runs destructors automatically when a value goes out of scope — RAII, the way C++ does it but enforced by ownership instead of by convention. The default destructor for our list is correct but recursive, and a long list overflows the stack. We need to write a non-recursive `Drop`.",
      "dynamic": "Cleanup in Rust is automatic but compiler-driven, not GC-driven. When a value goes out of scope its destructor runs — and the default destructor for a linked list will recurse one stack frame per node. A million-node list ends in a stack overflow. We have to write our own destructor that walks the list iteratively.",
      "beginner": "When a value goes out of scope in Rust — when the program leaves the chunk of code where the value was named — the value is automatically cleaned up. For most types this happens in the right order without any thinking. For a linked list, the automatic cleanup has a subtle bug: it is recursive, and a long enough list will crash the program by running out of stack space."
    },
    "steps": [
      {
        "prose": {
          "systems": "The default `Drop` for `List` drops `head`, which drops the `Box<Node>`, which drops the `Node`, which drops `next`, which drops the next `Box<Node>`, and so on. Every step is one stack frame. With a long list you blow the stack before any node is freed.",
          "dynamic": "Without our help, dropping the list drops its head, which drops a node, which drops its `next`, which drops the next node, and so on — one function call per node. The OS gives each thread a small stack (~8 MiB on Linux). A list with a few hundred thousand nodes runs out and crashes.",
          "beginner": "The default cleanup walks the list one link at a time, but each step is a function call. Every function call uses a tiny piece of memory called a stack frame, and the operating system gives each thread only a few megabytes of stack. A list with a few hundred thousand links runs out of stack and the program crashes before any memory is freed."
        },
        "code": "// conceptually, the auto-generated Drop:\nimpl Drop for List {\n    fn drop(&mut self) {\n        // drop self.head, which recurses into the Box<Node>...\n    }\n}"
      },
      {
        "prose": {
          "systems": "Write `Drop` by hand. Walk the list with a `while let` loop, taking each link out by value with `mem::replace`, dropping it explicitly when the loop body ends. No recursion, constant stack usage.",
          "dynamic": "The fix: a hand-written `drop` that loops. Each iteration we yank the current head out (replacing it with `Empty`), let the node fall out of scope at the end of the loop, and continue. Now the work is iterative — one stack frame total instead of one per node.",
          "beginner": "Write the cleanup by hand using a loop. Each pass through the loop pulls one link out (replacing it with empty), the link is automatically thrown away at the end of the loop body, and we move on to the next one. One stack frame for the entire loop instead of one per link."
        },
        "code": "use std::mem;\n\nimpl Drop for List {\n    fn drop(&mut self) {\n        let mut cur = mem::replace(&mut self.head, Link::Empty);\n        while let Link::More(mut node) = cur {\n            cur = mem::replace(&mut node.next, Link::Empty);\n            // node falls out of scope here, freeing its Box.\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Why `mem::replace` again? When the `while let` binds `node`, we own the `Box<Node>`. We need to extract `node.next` (to keep iterating) before the box is dropped, but the box is about to disappear at the end of the iteration. Replacing `node.next` with `Empty` first means dropping the box doesn't recurse into `next`.",
          "dynamic": "The trick: we have to break the chain before we drop the link. If we let the box drop with its `next` field still pointing into the rest of the list, the auto-drop recurses. By replacing `next` with `Empty` first, the box drops harmlessly — the rest of the list is now held by our `cur` variable.",
          "beginner": "Why is `mem::replace` here too? When the loop has hold of one link, it is about to be thrown away. If we let it go without first detaching its `next` field, the automatic cleanup of that field would recurse into the rest of the list — and we are right back to the original bug. Replacing `next` with empty before the link gets thrown away means the cleanup has nothing left to recurse into."
        },
        "code": "// trace of the loop, list = [1, 2, 3]:\n// iter 1: cur = More(node{1, next: More(node{2, ...})})\n//         -> cur = More(node{2, next: More(node{3, ...})})\n//         -> drop node{1}\n// iter 2: -> cur = More(node{3, next: Empty})\n//         -> drop node{2}\n// iter 3: -> cur = Empty\n//         -> drop node{3}\n// loop exits."
      }
    ],
    "tldr": {
      "systems": "The auto-derived `Drop` is recursive and overflows on long lists. Hand-written `Drop` walks the list iteratively with `mem::replace`, severing each link before the box drops so the auto-drop has nothing to recurse into.",
      "dynamic": "Cleanup runs automatically when scope ends — but the default cleanup of a linked list is one stack frame per node, which crashes on long lists. Write `Drop` by hand: a `while` loop that yanks each link out, breaks its `next`, and lets it drop one node at a time.",
      "beginner": "Rust runs cleanup automatically when a value goes out of scope, but the auto-cleanup for a linked list is recursive and crashes long lists. Write the cleanup by hand as a loop that yanks each link out, severs it, and moves on."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-drop.html"
  },
  {
    "chapterId": "first",
    "chapterNum": 1,
    "chapterTitle": "A Bad Stack",
    "title": "Final Code",
    "gesture": {
      "systems": "Eight short sections, one working stack. The chapter is \"bad\" because we used `i32` instead of a generic, reinvented `Option`, and skipped peek and iter. We'll fix all of that next chapter.",
      "dynamic": "A complete singly-linked stack. It is \"bad\" only by the standards of a production crate — we hard-coded the element type to `i32`, we built our own `Option`-shaped enum instead of using the real one, and we skipped iteration. The next chapter cleans all of that up.",
      "beginner": "Eight short sections, one working singly-linked stack. We hit a real wall (recursive types need indirection), met three flavors of `self`, learned `mem::replace`, met `Option<T>`, used `cargo test`, and wrote a manual `Drop` to dodge stack overflow on long lists. The next chapter polishes everything we just learned."
    },
    "steps": [
      {
        "prose": {
          "systems": "The whole module — keep it open in another tab while reading the next chapter; we'll refactor against this baseline.",
          "dynamic": "Here is everything in one place. The next chapter rewrites this module to use the standard `Option` and to be generic over the element type.",
          "beginner": "The full module in one place. Print it, read it once end-to-end, and then keep it open while reading the next chapter — we refactor against this baseline."
        },
        "code": "use std::mem;\n\npub struct List {\n    head: Link,\n}\n\nenum Link {\n    Empty,\n    More(Box<Node>),\n}\n\nstruct Node {\n    elem: i32,\n    next: Link,\n}\n\nimpl List {\n    pub fn new() -> Self {\n        List { head: Link::Empty }\n    }\n\n    pub fn push(&mut self, elem: i32) {\n        let new_node = Box::new(Node {\n            elem,\n            next: mem::replace(&mut self.head, Link::Empty),\n        });\n        self.head = Link::More(new_node);\n    }\n\n    pub fn pop(&mut self) -> Option<i32> {\n        match mem::replace(&mut self.head, Link::Empty) {\n            Link::Empty => None,\n            Link::More(node) => {\n                self.head = node.next;\n                Some(node.elem)\n            }\n        }\n    }\n}\n\nimpl Drop for List {\n    fn drop(&mut self) {\n        let mut cur = mem::replace(&mut self.head, Link::Empty);\n        while let Link::More(mut node) = cur {\n            cur = mem::replace(&mut node.next, Link::Empty);\n        }\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "A complete singly-linked stack in safe Rust: `push`, `pop`, hand-written `Drop`. Hard-coded to `i32` and reinventing `Option` — Chapter 2 fixes both.",
      "dynamic": "A complete singly-linked stack in safe Rust: `push`, `pop`, hand-written `Drop`. Hard-coded to `i32` and reinventing `Option` — Chapter 2 fixes both.",
      "beginner": "A complete singly-linked stack in safe Rust: `push`, `pop`, hand-written `Drop`. Hard-coded to `i32` for now, and rolling our own version of `Option` — Chapter 2 fixes both."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/first-final.html",
    "perspectives": {
      "systems": "You came in with malloc, free, and RAII as instincts and you spent this chapter watching Rust make the same trades you already make — explicitly. `Box<T>` is a single-owner heap allocation with a destructor; `&mut self` is a strict exclusive lock that you used to get for free with `__restrict__`-shaped reasoning; `mem::replace` is the canonical way to extract a value from a place you only have temporary access to. The interesting part of this chapter wasn't any one mechanism — it was that the borrow checker rejected your first attempt at `push` and the rejection was the lesson. The \"obvious\" code in C wasn't actually safe in C either; you were just allowed to ship it.",
      "dynamic": "You came in writing Python or Ruby where every variable is already a handle to a heap-allocated object and the runtime decides when to free things. Rust handed you the same heap but made the handle explicit (`Box<T>`) and tied freeing to scope instead of refcounting. The hardest sentence in the chapter was probably \"you cannot move a value out of a `&mut` reference\" — that has no analogue in your old languages, because your old languages let you mutate anything from anywhere. The point was: that freedom is also the source of every concurrency bug you've hit, and Rust traded it for `mem::replace` and a compile error you can fix.",
      "beginner": "You walked through eight short pieces and at the end you have a working program that stores numbers in a chain. Along the way three big ideas showed up. First: the heap is a pool of memory the program asks for as it runs, and `Box<T>` is the way you put a thing on the heap and get back a small note that says where it lives. Second: every value has exactly one owner, and when the owner goes away, the value is cleaned up automatically — no garbage collector, no leaks, decided by where in your code the value was named. Third: when the compiler refused your code, it was right. Each refusal pointed at a real bug — a half-finished list, a freed value used twice — and once you adjusted, the program was actually correct. That is the trade Rust offers: a slower start, a faster ride afterwards."
    }
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "chapterIntro": "The stack from Chapter 1 works, but it has four obvious problems: it only holds `i32`, it reinvents a worse `Option`, it can't be peeked at, and it can't be iterated. We fix all four in this chapter and end with something that genuinely resembles a real Rust collection.",
    "editionNotes": [
      {
        "edition": "2021",
        "body": "The 2021 prelude pulls `FromIterator` into scope automatically, which we don't use here but will lean on in later chapters. 2021 also tightened closure capture rules so that a closure over `node.elem` borrows only `elem`, not the whole `node` — relevant when we start passing closures into iterator methods."
      },
      {
        "edition": "2024",
        "body": "On Rust 2024 the borrow checker is slightly stricter about reborrows of `&mut` through pattern bindings. The `IterMut` code in this chapter still compiles cleanly, but if you experiment with variations you may see new errors that older editions accepted."
      }
    ],
    "title": "Option",
    "gesture": {
      "systems": "Look at `Link` from last chapter. Empty or `Box<Node>`. That's `Option<Box<Node>>` with the names changed. The standard library's `Option` already has every helper we hand-rolled with `mem::replace` and `match`.",
      "dynamic": "Our `Link` enum is `Option` in disguise. Empty or holds-a-thing. Rust's `Option<T>` is the standard tool for that, and it comes with a small pile of methods that collapse the patterns we wrote by hand."
    },
    "steps": [
      {
        "prose": {
          "systems": "Drop `Link` entirely. `Option<Box<Node>>` is the same shape — one tag bit, one pointer payload — and Rust knows the null-pointer optimization, so it's still one machine word.",
          "dynamic": "Replace `Link` with `Option<Box<Node>>`. `None` is the empty case, `Some(box)` is the head node. Same idea, standard name."
        },
        "code": "pub struct List {\n    head: Link,\n}\n\ntype Link = Option<Box<Node>>;\n\nstruct Node {\n    elem: i32,\n    next: Link,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Option::take` is `mem::replace(&mut x, None)` with a shorter name. It pulls the value out and leaves `None` in place. Every `mem::replace` call in `push`, `pop`, and `drop` becomes a `.take()`.",
          "dynamic": "`Option` has a method called `take` that does exactly what `mem::replace(..., None)` did: it gives you whatever was inside and resets the slot to `None`. We use it everywhere we used to call `mem::replace`."
        },
        "code": "pub fn push(&mut self, elem: i32) {\n    let new_node = Box::new(Node {\n        elem,\n        next: self.head.take(),\n    });\n    self.head = Some(new_node);\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Option::map` runs a closure on the inner value if there is one and gives you back a new `Option`. Our two-arm `match` in `pop` collapses to a single line.",
          "dynamic": "`map` is the other big helper: \"if there's something inside, transform it; if not, stay `None`.\" The pattern in `pop` — match on the head, do something with the node, return the element — is exactly what `map` does."
        },
        "code": "pub fn pop(&mut self) -> Option<i32> {\n    self.head.take().map(|node| {\n        self.head = node.next;\n        node.elem\n    })\n}",
        "lang": "rust"
      }
    ],
    "tldr": "Our `Link` was `Option<Box<Node>>`. Use the real one. `Option::take` replaces every `mem::replace(&mut x, None)`, and `Option::map` collapses the empty/non-empty match in `pop`.",
    "link": "https://rust-unofficial.github.io/too-many-lists/second-option.html"
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "title": "Generic",
    "gesture": {
      "systems": "Our list only holds `i32`. Generics in Rust are like C++ templates: a type parameter `T` that the compiler stamps out a fresh copy of the code for at each use site. Monomorphization, same as `std::vector<T>`.",
      "dynamic": "Right now the list is hard-coded to integers. We want a list of anything — strings, bools, other lists. That's a generic: a type parameter `T` that gets filled in by whoever uses the list."
    },
    "steps": [
      {
        "prose": {
          "systems": "Add `<T>` to every type and impl. The struct, the node, the link alias, the impl block header. The body of each method already speaks in terms of the field types, so almost nothing else changes.",
          "dynamic": "Sprinkle `<T>` on the struct, the node, the link, and the `impl` block. `T` is a placeholder that the user picks. Inside the methods, `elem` is now `T` instead of `i32`."
        },
        "code": "pub struct List<T> {\n    head: Link<T>,\n}\n\ntype Link<T> = Option<Box<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`push` and `pop` need `T` plumbed through their signatures. Note the `impl<T>` on the block — that introduces the parameter for everything inside, and `Self` already means `List<T>`.",
          "dynamic": "`push` takes a `T` instead of an `i32`. `pop` returns `Option<T>` instead of `Option<i32>`. The `impl<T>` line declares `T` once for the whole block."
        },
        "code": "impl<T> List<T> {\n    pub fn push(&mut self, elem: T) {\n        let new_node = Box::new(Node {\n            elem,\n            next: self.head.take(),\n        });\n        self.head = Some(new_node);\n    }\n\n    pub fn pop(&mut self) -> Option<T> {\n        self.head.take().map(|node| {\n            self.head = node.next;\n            node.elem\n        })\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Generics aren't free at the binary level — `List<i32>` and `List<String>` produce two separate copies of every method. That's monomorphization, and it's why Rust generics are zero-overhead at runtime but can balloon code size if you go wild.",
          "dynamic": "When you build with `List<i32>` and `List<String>` in the same program, Rust generates one specialized copy of each method per concrete type. Calls are direct, no indirection. The trade-off: more code in the final binary."
        },
        "code": "let mut a: List<i32> = List::new();\nlet mut b: List<String> = List::new();\na.push(1);\nb.push(\"hello\".to_string());"
      }
    ],
    "tldr": {
      "systems": "Add `<T>` everywhere. `impl<T> List<T>` introduces the parameter; the rest is mechanical. Generics are monomorphized — one specialized copy per concrete type, like C++ templates.",
      "dynamic": "Replace `i32` with a type parameter `T` and sprinkle `<T>` on the type, node, link, and `impl` block. Each concrete instantiation becomes its own compiled copy at build time."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/second-generic.html"
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "title": "Peek",
    "gesture": {
      "systems": "`peek` returns a reference to the head element without removing it: `Option<&T>`. The fight here is going from `&Option<Box<Node<T>>>` to `Option<&T>` without moving anything. That's what `as_ref` and `as_deref` exist for.",
      "dynamic": "`peek` looks at the front element without taking it. The return is `Option<&T>` — maybe a reference, if there is a head. Getting from `&self.head` (which is `&Option<...>`) to a reference to the inner element is a two-step shuffle Rust gives us methods for."
    },
    "steps": [
      {
        "prose": {
          "systems": "`Option::as_ref` converts `&Option<T>` into `Option<&T>`. Then `map` lets us reach into the `Box` and grab `&node.elem`. `Box<T>` derefs to `T`, so `&node.elem` is `&T`.",
          "dynamic": "`as_ref` turns `&Option<T>` into `Option<&T>` — \"a reference to the maybe-thing\" becomes \"a maybe reference to the thing.\" From there, `map` reaches into the box and pulls out a reference to `elem`."
        },
        "code": "impl<T> List<T> {\n    pub fn peek(&self) -> Option<&T> {\n        self.head.as_ref().map(|node| &node.elem)\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`as_deref` is the convenience version that combines `as_ref` with a `Deref`. On `Option<Box<Node<T>>>`, `as_deref()` gives you `Option<&Node<T>>` directly — useful when you want to skip past the `Box` indirection in one call. We'll lean on this shape in the iterators.",
          "dynamic": "There's a related method, `as_deref`, that does `as_ref` plus an automatic dereference. On `Option<Box<X>>` it gives you `Option<&X>` — one call instead of two. We'll see it again when we walk the list inside `Iter`."
        },
        "code": "// equivalent shapes:\nlet a: Option<&Node<T>> = self.head.as_ref().map(|b| &**b);\nlet b: Option<&Node<T>> = self.head.as_deref();"
      },
      {
        "prose": {
          "systems": "`peek_mut` is the mirror image: `as_mut` on `Option`, then `map` to a `&mut node.elem`. The signature returns `Option<&mut T>`, which the caller can use to overwrite the head element in place.",
          "dynamic": "`peek_mut` returns a *mutable* reference instead. Symmetric: `as_mut` instead of `as_ref`, `&mut node.elem` instead of `&node.elem`. The caller can change the head element without popping it."
        },
        "code": "impl<T> List<T> {\n    pub fn peek_mut(&mut self) -> Option<&mut T> {\n        self.head.as_mut().map(|node| &mut node.elem)\n    }\n}\n\nlet mut list: List<i32> = List::new();\nlist.push(1);\nif let Some(v) = list.peek_mut() { *v = 42; }\nassert_eq!(list.peek(), Some(&42));",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`as_ref`/`as_mut` lift `&Option<T>` to `Option<&T>` (or `&mut`) without moving the inner value. `as_deref` peels a `Box` off in the same step. `peek` and `peek_mut` are one-liners on top of these.",
      "dynamic": "To turn a borrow of an `Option` into an `Option` of a borrow, use `as_ref` (or `as_mut`). Then `map` reaches inside. `peek` returns `Option<&T>`; `peek_mut` returns `Option<&mut T>`."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/second-peek.html"
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "title": "IntoIter",
    "gesture": {
      "systems": "Rust's iteration protocol is a single trait, `Iterator`, with one required method: `fn next(&mut self) -> Option<Self::Item>`. To iterate, you build a state-machine struct, implement `Iterator` for it, and yield items from `next`. There's no `yield` keyword; you write the state machine yourself.",
      "dynamic": "Iterating a Rust collection means producing a separate iterator object that knows how to walk it. The object has one important method, `next`, which returns `Some(item)` or `None`. There is no generator syntax — you implement the state machine by hand."
    },
    "steps": [
      {
        "prose": {
          "systems": "There are three iter conventions in Rust, by the kind of access they grant: `into_iter` consumes the collection and yields owned values, `iter` borrows it shared and yields `&T`, `iter_mut` borrows it exclusively and yields `&mut T`. Standard collections all provide all three; we will too.",
          "dynamic": "Three flavors of iteration: `into_iter` gives you ownership of each item (and consumes the list), `iter` gives you read-only references, `iter_mut` gives you mutable references. Same shape across the standard library — every collection offers all three."
        },
        "code": "// for x in &list      // calls list.iter()       -> &T\n// for x in &mut list  // calls list.iter_mut()   -> &mut T\n// for x in list       // calls list.into_iter()  -> T (consumes list)"
      },
      {
        "prose": {
          "systems": "`IntoIter` is the easiest of the three because we already wrote `pop`. Wrap the list in a tuple struct, and `next` is just `self.0.pop()`. The list shrinks as we go; when it's empty, `pop` returns `None` and the iterator naturally terminates.",
          "dynamic": "Owning iteration is the easy one: keep the list inside the iterator and call `pop` on it each time `next` is asked. When the list is empty, `pop` returns `None`, which is exactly what `next` should return at the end."
        },
        "code": "pub struct IntoIter<T>(List<T>);\n\nimpl<T> List<T> {\n    pub fn into_iter(self) -> IntoIter<T> {\n        IntoIter(self)\n    }\n}\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> {\n        self.0.pop()\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Now `for x in list { ... }` works. The `for` loop calls `IntoIterator::into_iter`, which we've effectively provided via the inherent method (the trait impl for `for`-loop interop is mechanical and we'll add it later). The list is moved into the iterator and dropped element by element.",
          "dynamic": "With this in place, you can write `for x in list { ... }` and each `x` is an owned `T`. The list itself is consumed — you can't use it after the loop."
        },
        "code": "let mut list = List::new();\nlist.push(1); list.push(2); list.push(3);\nlet mut it = list.into_iter();\nassert_eq!(it.next(), Some(3));\nassert_eq!(it.next(), Some(2));\nassert_eq!(it.next(), Some(1));\nassert_eq!(it.next(), None);",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Implement `Iterator::next` on a state-machine struct. `IntoIter` owns the list and delegates `next` to `pop`. Three iteration conventions: `into_iter` (owned), `iter` (shared), `iter_mut` (exclusive).",
      "dynamic": "Iteration is a struct with a `next` method. `IntoIter` holds the list and pops on each call — when the list is empty, `next` returns `None`. Three flavors: owned, shared-ref, mutable-ref."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/second-into-iter.html"
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "title": "Iter",
    "gesture": {
      "systems": "`Iter` walks the list without consuming it, yielding `&T`. The iterator doesn't own anything — it holds a reference to the current node. That reference has to live as long as the borrow of the list it came from, so a lifetime appears in the type for the first time.",
      "dynamic": "`iter` produces an iterator over read-only references. The iterator itself has to remember where in the list it is, but it doesn't own the list — the list still belongs to the caller. Rust needs to be told how long the iterator's view into the list is allowed to live, which is what a lifetime parameter is."
    },
    "steps": [
      {
        "prose": {
          "systems": "`Iter<'a, T>` carries `Option<&'a Node<T>>`. `'a` is the lifetime of the borrow of the list — the iterator can't outlive the list it's walking. The constructor takes `&'a self` and uses `as_deref` to peel the `Box` off the head.",
          "dynamic": "The iterator holds an optional reference to the current node, tagged with a lifetime `'a`. That `'a` is the same one as the borrow of the list — the compiler tracks that the iterator is only valid while the list is. `as_deref` does the work of going from `Option<Box<Node>>` to `Option<&Node>`."
        },
        "code": "pub struct Iter<'a, T> {\n    next: Option<&'a Node<T>>,\n}\n\nimpl<T> List<T> {\n    pub fn iter(&self) -> Iter<'_, T> {\n        Iter { next: self.head.as_deref() }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Each `next` returns the current node's element and advances the cursor by walking `node.next.as_deref()` to the next `Option<&Node<T>>`. Shared references can be copied freely, so this is a one-line state update.",
          "dynamic": "On each `next` call we return a reference to the current element and step the cursor forward. Stepping forward means looking at the current node's `next` field and turning it into another `Option<&Node>` — again with `as_deref`. References to read-only data can be duplicated, so this is fine."
        },
        "code": "impl<'a, T> Iterator for Iter<'a, T> {\n    type Item = &'a T;\n    fn next(&mut self) -> Option<&'a T> {\n        self.next.map(|node| {\n            self.next = node.next.as_deref();\n            &node.elem\n        })\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The `'_` in `iter(&self) -> Iter<'_, T>` is the elided lifetime — the compiler infers it from `&self`. Spelling it out as `<'a>(&'a self) -> Iter<'a, T>` is equivalent.",
          "dynamic": "The `'_` is shorthand: \"use whatever lifetime fits.\" The compiler ties it to the borrow of `self`. You could write the lifetime out longhand, but `'_` is the idiomatic shape for a single elided lifetime."
        },
        "code": "let mut list = List::new();\nlist.push(1); list.push(2); list.push(3);\nlet mut it = list.iter();\nassert_eq!(it.next(), Some(&3));\nassert_eq!(it.next(), Some(&2));\nassert_eq!(it.next(), Some(&1));\nassert_eq!(it.next(), None);\n// list is still alive here.",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`Iter<'a, T>` is `Option<&'a Node<T>>`. `next` yields `&node.elem` and advances via `node.next.as_deref()`. Shared references are `Copy`, so the cursor update is a one-liner.",
      "dynamic": "Hold an optional reference to the current node, tagged with a lifetime. Each `next` returns `&elem` and steps to the next node via `as_deref`. The lifetime ties the iterator to the borrow of the list."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/second-iter.html"
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "title": "IterMut",
    "gesture": {
      "systems": "`IterMut` looks like `Iter` with `&mut` everywhere. It is not. Mutable references are not `Copy` — at any moment there is exactly one. To advance the cursor we have to *move* the current `&mut Node` out, take its `next` field, and put the new reference back. The tool for that is `Option::take`.",
      "dynamic": "Mutable iteration is genuinely harder. Rust enforces that there's only ever one mutable reference to a thing at a time, so we can't just copy the cursor like we did in `Iter`. To step forward we have to physically take the cursor out of the iterator, walk one step, and put the new cursor back."
    },
    "steps": [
      {
        "prose": {
          "systems": "Type and constructor mirror `Iter`. `as_deref_mut` is the `&mut` counterpart of `as_deref`: `Option<Box<Node<T>>> -> Option<&mut Node<T>>`.",
          "dynamic": "Same shape as `Iter`, but everything is `&mut`. The `as_deref_mut` method is the mutable version of `as_deref` — it turns `&mut Option<Box<Node>>` into `Option<&mut Node>`."
        },
        "code": "pub struct IterMut<'a, T> {\n    next: Option<&'a mut Node<T>>,\n}\n\nimpl<T> List<T> {\n    pub fn iter_mut(&mut self) -> IterMut<'_, T> {\n        IterMut { next: self.head.as_deref_mut() }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The body of `next` cannot read `self.next` and then assign to it — the read would be a copy of a `&mut`, which is forbidden. `Option::take` swaps `self.next` with `None`, handing us the inner `&mut Node` by value. We then split it into `&mut node.elem` (returned) and `node.next.as_deref_mut()` (stored back into `self.next`).",
          "dynamic": "We can't write `self.next.map(...)` like in `Iter`, because that would duplicate the mutable reference. Instead we `take` it: `self.next.take()` gives us the inner `&mut Node` and leaves `None` behind. Now we own the cursor, and we can split it into the element we yield and the next cursor we store back."
        },
        "code": "impl<'a, T> Iterator for IterMut<'a, T> {\n    type Item = &'a mut T;\n    fn next(&mut self) -> Option<&'a mut T> {\n        self.next.take().map(|node| {\n            self.next = node.next.as_deref_mut();\n            &mut node.elem\n        })\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Two things make this safe. First, each yielded `&mut T` borrows from a different node, so the references handed out across calls don't alias. Second, we only ever hold one cursor at a time — the `take` enforces that. The compiler verifies all of this without an `unsafe` keyword.",
          "dynamic": "Why does this work? Each `&mut T` we hand out points into a different node, so they don't conflict. And inside the iterator, there's only ever one cursor — the `take` guarantees it. Rust is satisfied; no `unsafe` needed."
        },
        "code": "let mut list = List::new();\nlist.push(1); list.push(2); list.push(3);\nfor v in list.iter_mut() { *v *= 10; }\nassert_eq!(list.pop(), Some(30));\nassert_eq!(list.pop(), Some(20));\nassert_eq!(list.pop(), Some(10));",
        "lang": "rust",
        "editionNotes": [
          {
            "edition": "2024",
            "body": "Rust 2024 tightened reborrow inference around `&mut` patterns inside iterators. The code above still compiles unchanged, but slight variations (e.g. assigning the cursor in two steps without `take`) that may have worked on 2021 can fail on 2024 with a clearer error pointing at the aliasing."
          }
        ]
      }
    ],
    "tldr": {
      "systems": "`&mut` is not `Copy`, so advancing the cursor requires `Option::take` to move it out, walk one step, and put the new one back. That's the only structural difference from `Iter` — and it's why `IterMut` is the section everyone gets stuck on.",
      "dynamic": "Mutable references can't be duplicated, so to step the cursor we have to take it out (`Option::take`), walk one node, and put the new cursor back. That single move is what makes `IterMut` harder than `Iter`."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/second-iter-mut.html"
  },
  {
    "chapterId": "second",
    "chapterNum": 2,
    "chapterTitle": "An Ok Stack",
    "title": "Final Code",
    "gesture": {
      "systems": "The complete module: generic over `T`, using `Option<Box<Node<T>>>`, with `peek`/`peek_mut`, `IntoIter`, `Iter`, and `IterMut`. Hand-written `Drop` carries over from Chapter 1. This is what a typical safe Rust collection looks like before you start optimizing.",
      "dynamic": "All the pieces in one file. Generic, idiomatic, three iteration flavors, peek and peek-mut, and the same iterative `Drop` we wrote last chapter. From here we'll move to harder shapes — shared ownership, doubly-linked, eventually unsafe — but this is a real, useful Rust collection."
    },
    "steps": [
      {
        "prose": {
          "systems": "Read it top to bottom. Every method is now a one- to three-line operation on `Option`, `Box`, or a pointer cursor. There is no `unsafe`, no `mem::replace`, no custom enum.",
          "dynamic": "Here it is end to end. Almost every method body is one or two lines. No custom enums, no `unsafe`, no manual memory management — just `Option`, `Box`, and the iterator trait."
        },
        "code": "pub struct List<T> {\n    head: Link<T>,\n}\n\ntype Link<T> = Option<Box<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None }\n    }\n\n    pub fn push(&mut self, elem: T) {\n        let new_node = Box::new(Node {\n            elem,\n            next: self.head.take(),\n        });\n        self.head = Some(new_node);\n    }\n\n    pub fn pop(&mut self) -> Option<T> {\n        self.head.take().map(|node| {\n            self.head = node.next;\n            node.elem\n        })\n    }\n\n    pub fn peek(&self) -> Option<&T> {\n        self.head.as_ref().map(|node| &node.elem)\n    }\n\n    pub fn peek_mut(&mut self) -> Option<&mut T> {\n        self.head.as_mut().map(|node| &mut node.elem)\n    }\n\n    pub fn into_iter(self) -> IntoIter<T> {\n        IntoIter(self)\n    }\n\n    pub fn iter(&self) -> Iter<'_, T> {\n        Iter { next: self.head.as_deref() }\n    }\n\n    pub fn iter_mut(&mut self) -> IterMut<'_, T> {\n        IterMut { next: self.head.as_deref_mut() }\n    }\n}\n\nimpl<T> Drop for List<T> {\n    fn drop(&mut self) {\n        let mut cur = self.head.take();\n        while let Some(mut node) = cur {\n            cur = node.next.take();\n        }\n    }\n}\n\npub struct IntoIter<T>(List<T>);\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> { self.0.pop() }\n}\n\npub struct Iter<'a, T> {\n    next: Option<&'a Node<T>>,\n}\n\nimpl<'a, T> Iterator for Iter<'a, T> {\n    type Item = &'a T;\n    fn next(&mut self) -> Option<&'a T> {\n        self.next.map(|node| {\n            self.next = node.next.as_deref();\n            &node.elem\n        })\n    }\n}\n\npub struct IterMut<'a, T> {\n    next: Option<&'a mut Node<T>>,\n}\n\nimpl<'a, T> Iterator for IterMut<'a, T> {\n    type Item = &'a mut T;\n    fn next(&mut self) -> Option<&'a mut T> {\n        self.next.take().map(|node| {\n            self.next = node.next.as_deref_mut();\n            &mut node.elem\n        })\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": "A generic singly-linked stack with `peek`, `peek_mut`, and all three iterator flavors — built on `Option`, `Box`, and lifetimes, with no `unsafe`. This is the baseline a real Rust collection looks like.",
    "link": "https://rust-unofficial.github.io/too-many-lists/second-final.html"
  },
  {
    "chapterId": "third",
    "chapterNum": 3,
    "chapterTitle": "A Persistent Stack",
    "chapterIntro": "We've been single-owner the whole book. A persistent list shares its tail across many lists at once — prepend a new head, hand someone else the old list, both keep working. Single ownership can't express that. We need reference counting.",
    "title": "Layout",
    "gesture": {
      "systems": "Persistent lists share suffixes. List `B = 1 -> 2 -> 3` and list `C = 0 -> 2 -> 3` should both point at the same `2 -> 3` tail in memory; freeing `B` must not free a node `C` is still using. `Box<T>` is a single owner, so it can't model this. Rust's answer is `Rc<T>` — a shared owner with an embedded refcount, the safe-Rust analogue of `std::shared_ptr`.",
      "dynamic": "A persistent list is one where prepending or popping returns a *new* list and leaves the old one untouched. Many lists end up sharing the same tail in memory. With `Box<T>` only one variable can own a node, so two lists can't point at the same tail. We need a type that lets multiple owners share one allocation — and frees it when the last one goes away."
    },
    "steps": [
      {
        "prose": {
          "systems": "`Rc<T>` (reference-counted) is a heap allocation with a count next to the value. `Rc::clone` bumps the count; the `Drop` of an `Rc` decrements it; the last drop frees the allocation. Conceptually identical to `std::shared_ptr<T>` minus the atomics — single-threaded, so the count is a plain integer.",
          "dynamic": "`Rc<T>` stores a value on the heap together with a counter. Cloning an `Rc` doesn't copy the value — it just increments the counter and hands you another handle to the same allocation. When the last handle drops, the counter hits zero and the value is freed. If you've used Python, this is exactly how Python's interpreter manages most objects under the hood; the difference is in Rust *you* opt into it by reaching for `Rc`."
        },
        "code": "use std::rc::Rc;\n\npub struct List<T> {\n    head: Link<T>,\n}\n\ntype Link<T> = Option<Rc<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Two lists can now point at the same `Rc<Node<T>>`. Clone the `Rc` and the count goes from 1 to 2; both lists hold a handle; whichever drops second runs the destructor. We're using `Option<Rc<Node<T>>>` rather than a hand-rolled `Link` enum — last chapter taught us that.",
          "dynamic": "With `Rc<Node<T>>` two different `List` values can hold the same node. Cloning the `Rc` is cheap — it just bumps the refcount. The node stays alive as long as *any* list still references it. We're using `Option` for empty/non-empty instead of a custom enum, the way the standard library would."
        },
        "code": "// list_a:  1 -> 2 -> 3 -> Nil\n// list_b:  0 -> 2 -> 3 -> Nil   (shares the 2->3 tail)\n//\n// the node holding `2`:\n//   refcount = 2  (list_a's node-1 points at it; list_b's node-0 points at it)\n// the node holding `3`:\n//   refcount = 1  (only the node holding `2` points at it)"
      },
      {
        "prose": {
          "systems": "One catch: `Rc<T>` only hands out shared references. There is no `Rc::get_mut` once the count is above one, because mutation through a shared owner would be a data race waiting to happen. Persistence is the natural fit — we never mutate; we build new lists that share old tails. (For interior mutability under `Rc` you'd reach for `RefCell`, which is the next chapter's mistake.)",
          "dynamic": "There's a price: you can't mutate the value inside an `Rc` while anyone else holds a reference to it. The compiler enforces this — `Rc<T>` only gives you `&T`, never `&mut T`. That sounds restrictive, but it lines up perfectly with what we want here: a *persistent* list is by definition one that nobody mutates. Every operation builds a fresh list."
        },
        "code": "let shared: Rc<i32> = Rc::new(42);\nlet a = Rc::clone(&shared);  // refcount = 2\nlet b = Rc::clone(&shared);  // refcount = 3\n\n// *a = 99;  // error: cannot assign through `&` reference\n//           // Rc only gives out shared access.",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`Box<T>` is one owner; persistent lists need many. `Rc<T>` is `shared_ptr<T>` for single-threaded code: heap allocation plus refcount, last clone frees. Mutation through an `Rc` is forbidden — perfect for an immutable list.",
      "dynamic": "Use `Rc<T>` when several places need to keep a value alive. Cloning bumps a counter; the value drops when the count hits zero. You can't mutate through an `Rc`, which is exactly what a persistent (never-mutated) list wants."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/third-layout.html"
  },
  {
    "chapterId": "third",
    "chapterNum": 3,
    "chapterTitle": "A Persistent Stack",
    "title": "Basics",
    "gesture": {
      "systems": "No `push`/`pop` — those imply mutation. The persistent vocabulary is `prepend(elem)` and `tail()`, both of which take `&self` and return a brand-new `List` that shares structure with the old one. `head()` returns `Option<&T>` for read access. Every method is non-mutating; the borrow checker has no work to do.",
      "dynamic": "Because the list is immutable, the operations are different. `prepend` returns a new list with `elem` at the front and the original list as the tail. `tail` returns a new list that's everything except the head. `head` peeks at the front element. None of these change `self` — they return fresh `List` values that share nodes with the original."
    },
    "steps": [
      {
        "prose": {
          "systems": "`new` and `prepend`: build a node whose `next` is a clone of `self.head`. `Rc::clone` of an `Option<Rc<_>>` is just `self.head.clone()` — `Option::clone` calls `Rc::clone` on the inner handle, which is a refcount bump, not a deep copy.",
          "dynamic": "`new` returns an empty list. `prepend` makes a new node, sets its `next` to a clone of the current head, and wraps it in a `List`. Cloning an `Option<Rc<Node<T>>>` is cheap — it just bumps the refcount on the existing tail. The original list is untouched and still usable."
        },
        "code": "impl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None }\n    }\n\n    pub fn prepend(&self, elem: T) -> List<T> {\n        List {\n            head: Some(Rc::new(Node {\n                elem,\n                next: self.head.clone(),\n            })),\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`tail` returns the rest of the list. `self.head.as_ref()` borrows the `Option<Rc<Node<T>>>` as `Option<&Rc<Node<T>>>`; `.and_then` extracts `node.next.clone()` if there's a head, or `None` otherwise. Net cost: at most one refcount bump.",
          "dynamic": "`tail` returns the list minus its first element. If `self` is empty, the tail is also empty. If it has a head, the tail is whatever that head's `next` pointed at — we clone the `Rc` (refcount bump) and wrap it in a new `List`. The original list is unmodified."
        },
        "code": "impl<T> List<T> {\n    pub fn tail(&self) -> List<T> {\n        List {\n            head: self.head.as_ref().and_then(|node| node.next.clone()),\n        }\n    }\n\n    pub fn head(&self) -> Option<&T> {\n        self.head.as_ref().map(|node| &node.elem)\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Notice every method takes `&self`. There's no `&mut self` anywhere — the data structure is immutable from the outside. `prepend` and `tail` produce values; the caller decides whether to bind them to a new name or shadow the old one. Sharing is free at the API level: clone the list itself (via `Rc::clone` if you wrap it, or by re-running `prepend`) and you have two persistent views.",
          "dynamic": "Every method takes `&self`, never `&mut self`. The list never mutates — every operation builds a new list that shares structure with the old one. This is what \"persistent\" means: old versions of the data structure stay alive and valid as long as anyone holds a reference."
        },
        "code": "let list = List::new().prepend(1).prepend(2).prepend(3);\n// list:    3 -> 2 -> 1 -> Nil\n\nlet shorter = list.tail();\n// shorter: 2 -> 1 -> Nil\n// list is still 3 -> 2 -> 1 -> Nil; both lists alive.\n\nassert_eq!(list.head(),    Some(&3));\nassert_eq!(shorter.head(), Some(&2));",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`prepend` and `tail` take `&self` and return new `List` values that share nodes with the input via `Rc::clone` (a refcount bump). `head` returns `Option<&T>`. No `&mut self` anywhere — persistence means immutability.",
      "dynamic": "Persistent operations don't mutate — they return new lists. `prepend` adds a node; `tail` strips one off; `head` peeks. Old and new lists share their common tail through `Rc`'s refcount, so nothing is copied."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/third-basics.html"
  },
  {
    "chapterId": "third",
    "chapterNum": 3,
    "chapterTitle": "A Persistent Stack",
    "title": "Drop",
    "gesture": {
      "systems": "Same recursive-drop hazard as the `Box` list, with a wrinkle. Dropping an `Rc<Node>` only actually frees the node when the refcount hits zero — if another list still shares this tail, drop is a single decrement and we stop. But if we *are* the last owner of a long uniquely-held list, the auto-derived destructor recurses one frame per node and overflows.",
      "dynamic": "We have the same problem we had with `Box`: dropping a long list recursively calls drop on each node and can blow the stack. With `Rc` it's slightly nicer — if some other list still shares the tail, our drop just decrements the refcount and stops there, no recursion. But when we *are* the last owner of a long, unshared list, the recursion is back."
    },
    "steps": [
      {
        "prose": {
          "systems": "We can't use `mem::replace` to walk the list because we don't own the node — we only hold an `Rc<Node>`. The right tool is `Rc::try_unwrap`: if the refcount is exactly one, it consumes the `Rc` and gives us the inner `Node` by value; otherwise it hands the `Rc` back. We loop, unwrapping where we're the sole owner and stopping the moment a node is shared.",
          "dynamic": "We need a hand-written `Drop` that walks the list iteratively. The trick: `Rc::try_unwrap` succeeds only if we're the *only* owner of that node — in which case it consumes the `Rc` and gives us the inner `Node` so we can keep walking. If the node is shared with another list, `try_unwrap` fails (the other owner is still using it), and our drop is done."
        },
        "code": "use std::mem;\n\nimpl<T> Drop for List<T> {\n    fn drop(&mut self) {\n        let mut head = self.head.take();\n        while let Some(node) = head {\n            if let Ok(mut node) = Rc::try_unwrap(node) {\n                // we were the sole owner — keep walking.\n                head = node.next.take();\n            } else {\n                // someone else still holds this node; stop.\n                break;\n            }\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Trace it. `head.take()` pulls the head out as an `Option<Rc<Node>>`, leaving `None` behind. `Rc::try_unwrap(node)` succeeds (refcount was 1), yielding the `Node` by value. We `take` *its* `next` and loop. When `try_unwrap` fails, we break — the remaining nodes are someone else's problem, and dropping the `Rc` we couldn't unwrap is just one decrement.",
          "dynamic": "Step by step: pull the head out (`Option::take` swaps in `None` and hands you the old value). Try to unwrap the `Rc` — succeeds if the refcount was 1. If it succeeded, we own the `Node`; pull its `next` out and loop. If it failed, the node is shared and we stop. Either way, no recursion, constant stack."
        },
        "code": "// uniquely-held: 3 -> 2 -> 1 -> Nil  (refcounts all 1)\n//   iter 1: try_unwrap node{3} -> Ok; head = Some(node{2})\n//   iter 2: try_unwrap node{2} -> Ok; head = Some(node{1})\n//   iter 3: try_unwrap node{1} -> Ok; head = None; loop exits.\n//\n// shared tail: 5 -> [2 -> 1] where [2 -> 1] is also held by another list\n//   iter 1: try_unwrap node{5} -> Ok; head = Some(node{2})\n//   iter 2: try_unwrap node{2} -> Err (refcount 2); break.\n//           Rc<Node{2}> drops here -> refcount goes 2 -> 1. Done."
      }
    ],
    "tldr": {
      "systems": "Auto-derived `Drop` recurses per node and can overflow on long uniquely-owned lists. `Rc::try_unwrap` walks iteratively, consuming nodes only where we're the sole owner; when it returns `Err`, another list still holds this tail and we stop.",
      "dynamic": "Long lists can blow the stack via recursive drop. Loop with `Rc::try_unwrap` instead — it gives you the inner node only when you're the last owner. If a tail is shared, the loop stops there and the rest stays alive for whoever else holds it."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/third-drop.html"
  },
  {
    "chapterId": "third",
    "chapterNum": 3,
    "chapterTitle": "A Persistent Stack",
    "title": "Arc",
    "gesture": {
      "systems": "`Rc<T>` uses a non-atomic counter — fast, but unsound across threads. `Arc<T>` is the same shape with `fetch_add`/`fetch_sub` on the count, identical to going from `shared_ptr` to `atomic_shared_ptr`. The compiler refuses to send an `Rc` across threads; switching to `Arc` makes the list `Send` and `Sync` automatically.",
      "dynamic": "`Rc<T>` is single-threaded only — its counter isn't atomic, so two threads incrementing it could lose updates and free memory while still in use. `Arc<T>` is the thread-safe twin: same API, atomic counter, slightly slower. Swap every `Rc` for `Arc` and the list becomes safe to share across threads."
    },
    "steps": [
      {
        "prose": {
          "systems": "Mechanical change: `use std::sync::Arc` instead of `std::rc::Rc`, then global rename. The API is identical — `Arc::new`, `Arc::clone`, `Arc::try_unwrap` all exist with the same signatures. Cost is one atomic RMW per clone/drop instead of a plain integer write; for a persistent immutable list this is usually fine.",
          "dynamic": "The change is purely a search-and-replace. `Arc` has the same methods as `Rc`. Every clone now does an atomic increment instead of a plain one — measurably slower under heavy clone traffic, but correct across threads."
        },
        "code": "use std::sync::Arc;\n\npub struct List<T> {\n    head: Link<T>,\n}\n\ntype Link<T> = Option<Arc<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}\n\n// prepend, tail, head, Drop are unchanged except Rc -> Arc.",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Send` and `Sync` are auto traits — the compiler infers them from the fields. A type is `Send` if all its fields are `Send` (movable across threads) and `Sync` if `&T` is safe to share across threads. `Arc<T>` is both when `T: Send + Sync`; `Rc<T>` is neither. Once you swap, `List<T>` picks up both auto traits and you can `std::thread::spawn` with it for free.",
          "dynamic": "`Send` means \"safe to move to another thread\"; `Sync` means \"safe for two threads to share a reference at once\". You don't implement them — the compiler figures them out from the contents of your type. `Rc` is explicitly *not* `Send` (its counter isn't atomic). `Arc` *is*. So your `List<T>` automatically becomes thread-safe when `T` is."
        },
        "code": "use std::thread;\n\nlet shared = List::new().prepend(1).prepend(2).prepend(3);\nlet clone1 = shared.clone();   // refcount bump, atomic\nlet clone2 = shared.clone();\n\nthread::spawn(move || {\n    assert_eq!(clone1.head(), Some(&3));\n});\nthread::spawn(move || {\n    assert_eq!(clone2.head(), Some(&3));\n});\n// would not compile with Rc — the closures aren't Send.",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`Arc<T>` is `Rc<T>` with an atomic refcount: same API, `Send + Sync` when `T` is. Swap the import and the list works across threads. `Send`/`Sync` are auto-implemented by the compiler from a type's fields.",
      "dynamic": "For threads, use `Arc<T>` instead of `Rc<T>` — same shape, atomic counter. The compiler then automatically marks your list `Send` and `Sync`, so you can move it between threads without any extra boilerplate."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/third-arc.html"
  },
  {
    "chapterId": "third",
    "chapterNum": 3,
    "chapterTitle": "A Persistent Stack",
    "title": "Final Code",
    "gesture": {
      "systems": "Five sections, one persistent stack with shared tails and an iterative `Drop`. Using `Arc` rather than `Rc` so the result is thread-safe by default; flip the import to `std::rc::Rc` if you only need single-threaded performance.",
      "dynamic": "Here's the whole module. We landed on `Arc` so the list works across threads; if you only need it on one thread, switching to `Rc` is a one-line change with slightly faster clones."
    },
    "steps": [
      {
        "prose": {
          "systems": "The complete persistent list. Read it next to Chapter 1's stack — same skeleton, different ownership story.",
          "dynamic": "Everything assembled. Compare it to Chapter 1's stack: same shape, but every operation builds new lists instead of mutating, and `Arc` lets multiple lists share one tail."
        },
        "code": "use std::sync::Arc;\n\npub struct List<T> {\n    head: Link<T>,\n}\n\ntype Link<T> = Option<Arc<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None }\n    }\n\n    pub fn prepend(&self, elem: T) -> List<T> {\n        List {\n            head: Some(Arc::new(Node {\n                elem,\n                next: self.head.clone(),\n            })),\n        }\n    }\n\n    pub fn tail(&self) -> List<T> {\n        List {\n            head: self.head.as_ref().and_then(|node| node.next.clone()),\n        }\n    }\n\n    pub fn head(&self) -> Option<&T> {\n        self.head.as_ref().map(|node| &node.elem)\n    }\n}\n\nimpl<T> Drop for List<T> {\n    fn drop(&mut self) {\n        let mut head = self.head.take();\n        while let Some(node) = head {\n            if let Ok(mut node) = Arc::try_unwrap(node) {\n                head = node.next.take();\n            } else {\n                break;\n            }\n        }\n    }\n}\n\n#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn basics() {\n        let list = List::new();\n        assert_eq!(list.head(), None);\n\n        let list = list.prepend(1).prepend(2).prepend(3);\n        assert_eq!(list.head(), Some(&3));\n\n        let list = list.tail();\n        assert_eq!(list.head(), Some(&2));\n\n        let list = list.tail();\n        assert_eq!(list.head(), Some(&1));\n\n        let list = list.tail();\n        assert_eq!(list.head(), None);\n\n        // tail of empty is empty.\n        let list = list.tail();\n        assert_eq!(list.head(), None);\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": "A complete persistent stack: `prepend`, `tail`, `head`, plus an iterative `Drop` using `Arc::try_unwrap`. Thread-safe via `Arc`; switch to `Rc` for a single-threaded speedup.",
    "link": "https://rust-unofficial.github.io/too-many-lists/third-final.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "chapterIntro": "A doubly-linked list in 100% safe Rust. It is possible. It is also a structurally bad design — and the point of this chapter is to show you exactly why, by building it.",
    "title": "Layout",
    "gesture": {
      "systems": "A doubly-linked list needs nodes that point at each other in both directions. Two nodes referencing one another means neither one can uniquely own the other — single-owner `Box` is out. We need shared ownership *and* mutation through the share, which is `Rc<RefCell<T>>`.",
      "dynamic": "Each node in a doubly-linked list has a `prev` and a `next` pointer, and the list keeps a `head` and a `tail`. Multiple things have to point at the same node, so single ownership won't work. We need shared ownership (Rc) plus the ability to mutate through that share (RefCell)."
    },
    "steps": [
      {
        "prose": {
          "systems": "`Rc<T>` from Chapter 3 gave us shared ownership but only `&T` access — read-only. To mutate the contents through an `Rc`, you wrap the inside in `RefCell<T>`. `RefCell` is interior mutability: it lets you take a `&mut` to its contents through a `&` reference, by tracking borrows at runtime instead of compile time. Think `shared_ptr<mutex<T>>` without the locking — same shape, single-threaded, panic instead of deadlock.",
          "dynamic": "`Rc<T>` shares a value between owners but only lets you read it. To allow mutation, wrap the value in `RefCell<T>`. A RefCell is what Rust calls *interior mutability* — borrow-checking moved from compile time to runtime. Break the rules and it panics instead of refusing to compile."
        },
        "code": "use std::cell::RefCell;\nuse std::rc::Rc;\n\npub struct List<T> {\n    head: Link<T>,\n    tail: Link<T>,\n}\n\ntype Link<T> = Option<Rc<RefCell<Node<T>>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n    prev: Link<T>,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The `Link<T>` alias hides the triple wrap. Every link is optional (might be the end), counted (shared between the neighbouring node and possibly the list itself), and cell-wrapped (so the neighbour can rewrite it later). At runtime each link is one fat pointer plus an enum tag.",
          "dynamic": "Read the type from the outside in: a link is *optional* (might be empty), it's an *Rc* (multiple owners), it wraps a *RefCell* (mutation allowed), which holds the *Node*. Three layers of bookkeeping per pointer. That cost is the price of the design."
        },
        "code": "impl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None, tail: None }\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Doubly-linked nodes alias each other, so single-owner `Box` cannot represent them. Use `Rc<RefCell<Node<T>>>` to get shared ownership plus runtime-checked interior mutability. Every link pays for an Rc count and a RefCell borrow flag.",
      "dynamic": "Each link is `Option<Rc<RefCell<Node<T>>>>` — optional, shared, mutable through the share. RefCell moves borrow-checking to runtime: break the rules, get a panic instead of a compile error."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-layout.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "title": "Building",
    "gesture": {
      "systems": "`push_front`: allocate a node, link it to the old head in both directions, swing `self.head`. The shape is the same as the singly-linked stack but every field write goes through `borrow_mut()` on a RefCell, and every node pointer is cloned through `Rc::clone`.",
      "dynamic": "Pushing onto the front is the same idea as before — make a new node, point it at the current head, become the new head — but with two-way links. Because the data lives behind RefCells, every assignment is `node.borrow_mut().field = ...` instead of `node.field = ...`."
    },
    "steps": [
      {
        "prose": {
          "systems": "Build the new node, wrap it in `Rc::new(RefCell::new(...))`, then patch up the old head's `prev` pointer to point at the new node. The old head and the new node both hold an `Rc` to each other — refcount 2 on each.",
          "dynamic": "Wrap the new node in `Rc::new(RefCell::new(...))` to get the shared, mutable handle. If the list already had a head, that old head needs its `prev` set to the new node, and the new node's `next` needs to be the old head. Two pointers each direction."
        },
        "code": "pub fn push_front(&mut self, elem: T) {\n    let new_head = Rc::new(RefCell::new(Node {\n        elem,\n        prev: None,\n        next: None,\n    }));\n    match self.head.take() {\n        Some(old_head) => {\n            old_head.borrow_mut().prev = Some(new_head.clone());\n            new_head.borrow_mut().next = Some(old_head);\n            self.head = Some(new_head);\n        }\n        None => {\n            // empty list: head and tail both become the new node\n            self.tail = Some(new_head.clone());\n            self.head = Some(new_head);\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`borrow_mut()` returns a `RefMut<T>` guard. While the guard is alive, no other borrow of that RefCell can exist; another `borrow()` or `borrow_mut()` on the same cell will panic. The compiler does not know any of this — the check is at runtime, on every call.",
          "dynamic": "`borrow_mut()` is the runtime version of `&mut`. It hands you a guard that acts like `&mut T`. While that guard is alive, asking the same RefCell for any other borrow — even a read — will panic. The rules from compile time are still in force; they're just enforced later, by crashing."
        },
        "code": "// fine: two separate cells\nlet a = node_a.borrow_mut();\nlet b = node_b.borrow_mut();\n\n// panic: same cell, two mut borrows\nlet x = node.borrow_mut();\nlet y = node.borrow_mut(); // thread 'main' panicked at 'already borrowed: BorrowMutError'",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The empty-list arm has to set both `head` and `tail` to the same node, which means cloning the `Rc`. `Rc::clone` (also spelled `.clone()` on an `Rc`) bumps the refcount, doesn't deep-copy the node. Two `Rc` handles, one heap allocation.",
          "dynamic": "When the list is empty, the new node becomes both head and tail. We need two handles to the same node — that's what `Rc::clone` is for. It bumps a counter, doesn't copy the data. When all handles are dropped, the count hits zero and the node is freed."
        },
        "code": "// after push_front on an empty list:\n// self.head -> Rc(count=2) -> Node{...}\n// self.tail -> Rc(count=2) -> (same Node)",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`push_front` is the standard prepend, but every field assignment goes through `borrow_mut()` and every neighbour pointer is an `Rc::clone`. `borrow_mut` panics if any other borrow on the same cell is live — runtime enforcement of the aliasing rules.",
      "dynamic": "Building the list works, with extra ceremony. `borrow_mut()` is the runtime `&mut`; if two are live on the same RefCell, the program panics. `Rc::clone` makes a second handle to the same node without copying it."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-building.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "title": "Breaking",
    "gesture": {
      "systems": "`pop_front` reverses `push_front`: take the head, splice the second node in as the new head, return the old element. The complication is unwrapping the element out from inside `Rc<RefCell<Node<T>>>` — there are three layers to peel.",
      "dynamic": "Popping the front means removing the head node and giving back its element. The element is buried: it's inside a Node, which is inside a RefCell, which is inside an Rc. Each layer needs its own removal step."
    },
    "steps": [
      {
        "prose": {
          "systems": "Take the head out with `Option::take`. Now we own one `Rc<RefCell<Node<T>>>`. Look at the head's `next` field — that's the new head. If it exists, null its `prev`; either way, splice it into `self.head`. If `next` is `None`, the list is now empty, so clear `self.tail` too.",
          "dynamic": "Step one: detach the head. `self.head.take()` gives us the old head and leaves `None` behind. Step two: look at its `next` to find the new head. Step three: if there was a new head, clear *its* `prev`; if there wasn't, the list is now empty, so clear `tail` as well."
        },
        "code": "pub fn pop_front(&mut self) -> Option<T> {\n    self.head.take().map(|old_head| {\n        match old_head.borrow_mut().next.take() {\n            Some(new_head) => {\n                new_head.borrow_mut().prev.take();\n                self.head = Some(new_head);\n            }\n            None => {\n                self.tail.take();\n            }\n        }\n        // ... extract elem from old_head ...\n        Rc::try_unwrap(old_head).ok().unwrap().into_inner().elem\n    })\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Rc::try_unwrap(rc)` returns `Ok(T)` if the refcount is 1 (we are the unique owner) and `Err(rc)` otherwise — it can't safely move out if anyone else still holds a handle. Once we've severed the neighbours' pointers above, our `old_head` is the last `Rc`, so `try_unwrap` succeeds. Then `RefCell::into_inner` extracts the `Node<T>` from the cell, and `.elem` finally gets us the element.",
          "dynamic": "Why three steps to get the element out? `Rc::try_unwrap` only works if we're the *only* holder of the Rc — otherwise moving the value out would leave dangling handles. We just disconnected the neighbours, so we are. Then `RefCell::into_inner` gives us the Node; `.elem` gives us T."
        },
        "code": "// the unwrap chain, expanded:\nlet rc: Rc<RefCell<Node<T>>> = old_head;\nlet cell: RefCell<Node<T>> = Rc::try_unwrap(rc).ok().unwrap();\nlet node: Node<T>           = cell.into_inner();\nlet elem: T                 = node.elem;",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Why `.ok().unwrap()` rather than `.unwrap()` directly? `Rc::try_unwrap` returns `Result<T, Rc<T>>` — the error carries the Rc back, which doesn't implement `Debug` unless `T` does. `.ok()` discards the error into an `Option`, which `unwrap` is happy with. The `unwrap` here would only fire on a logic bug; in correct code the refcount is always 1 at this point.",
          "dynamic": "The `.ok().unwrap()` dance is a small irritation: `try_unwrap` hands the original Rc back on failure, and to use `.unwrap()` directly the error type would need to print itself — which it can't always. Convert to `Option` first, unwrap that. If this ever panics it means our list invariant is broken."
        },
        "code": "let mut list = List::new();\nlist.push_front(1);\nlist.push_front(2);\nassert_eq!(list.pop_front(), Some(2));\nassert_eq!(list.pop_front(), Some(1));\nassert_eq!(list.pop_front(), None);",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`pop_front` rewires the neighbours then peels three layers off the old head: `Rc::try_unwrap` (succeeds because we just severed the only other reference), `RefCell::into_inner`, then `.elem`. The unwraps are infallible if the list invariant holds.",
      "dynamic": "Popping has to disassemble a triple wrap: `Rc::try_unwrap` for the share, `into_inner` for the cell, field access for the node. Each layer needs its own undo, and each undo can in principle fail — they don't, but only because we set things up so they can't."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-breaking.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "title": "Peek",
    "gesture": {
      "systems": "Peek wants to return `Option<&T>` — a borrow of the head element without taking it. We can't. The element lives inside a `RefCell`, and the only way to read across a RefCell is through a `Ref<T>` guard. The RefCell type leaks into our public API.",
      "dynamic": "Peek is supposed to look at the front element without removing it. Easy in the previous chapters — return a reference. Here it isn't easy: the element is behind a RefCell, and you can only borrow through a RefCell by holding a runtime guard."
    },
    "steps": [
      {
        "prose": {
          "systems": "`RefCell::borrow()` returns a `Ref<'_, T>` — a smart pointer that derefs to `&T` and bumps an internal read-borrow counter. The counter decrements on drop. Returning `&T` directly out of a `borrow()` would let the caller hold the reference past the guard's lifetime, which would let you violate the borrow rules. The API forces you to keep the guard.",
          "dynamic": "When you call `.borrow()` on a RefCell you get a `Ref<T>`, not a plain `&T`. The `Ref` is a guard: while it's alive, the RefCell knows there's a reader, and won't allow a writer. You can deref it to read `T`, but you can't hand a raw `&T` back across the guard's lifetime — there'd be no way to maintain the count."
        },
        "code": "use std::cell::Ref;\n\npub fn peek_front(&self) -> Option<Ref<T>> {\n    self.head.as_ref().map(|node| {\n        Ref::map(node.borrow(), |n| &n.elem)\n    })\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Ref::map` projects the guard. It takes `Ref<'_, A>` and a closure `&A -> &B`, returns `Ref<'_, B>` — same guard, narrower view. We use it to convert `Ref<Node<T>>` into `Ref<T>` so callers don't see the Node type at all. They still see `Ref`, though.",
          "dynamic": "`Ref::map` lets you zoom in on a part of the borrowed value while keeping the same guard. Here we start with a `Ref<Node<T>>` from `node.borrow()` and narrow it to a `Ref<T>` pointing at just the `elem` field. The guard's lifetime is unchanged."
        },
        "code": "let mut list = List::new();\nlist.push_front(\"hello\");\n{\n    let head: Ref<&str> = list.peek_front().unwrap();\n    assert_eq!(*head, \"hello\");\n} // guard drops here, RefCell is unborrowed",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "This is where the design admits defeat. `Option<Ref<T>>` in the public signature means callers must import `std::cell::Ref`, must understand RefCell semantics, and must be careful not to hold the guard across calls that would re-borrow the same cell. We are exporting our internal storage choice as part of our type signature.",
          "dynamic": "The signature `Option<Ref<T>>` is the leak. A caller of our list now has to know what a `Ref` is, which means they have to know we used a RefCell. The standard library's deque returns a plain `&T` from its peek; ours can't, because of how we chose to store the data."
        },
        "code": "// The leak — compare:\n// std::collections::VecDeque::front(&self) -> Option<&T>\n// our List::peek_front(&self)              -> Option<Ref<T>>",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "RefCell only lets you borrow through a `Ref<T>` guard, and that guard has to be live for as long as the borrow exists — so we can't return `&T`, only `Option<Ref<T>>`. Use `Ref::map` to narrow the guard to the element field. The signature leaks `RefCell` to every caller.",
      "dynamic": "Peek can't return `Option<&T>`; it has to return `Option<Ref<T>>` because reading through a RefCell requires holding a runtime guard. `Ref::map` narrows the guard from the whole node to just the element. Our storage choice is now part of the public API."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-peek.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "title": "Symmetric Cases",
    "gesture": "Everything we did for the front exists for the back, with `head` and `tail` swapped and `next` and `prev` swapped. The `_mut` peek variants are the same shape but call `borrow_mut` and return `RefMut<T>` instead of `Ref<T>`. Boilerplate, no new ideas.",
    "steps": [
      {
        "prose": {
          "systems": "`push_back`, `pop_back`, `peek_back`: text-substitute the front versions. `head` becomes `tail`, `tail` becomes `head`, `next` becomes `prev`, `prev` becomes `next`. Same code, mirrored.",
          "dynamic": "Mirror everything. Same logic, but operating on the tail end of the list. The implementations differ only in field names."
        },
        "code": "pub fn push_back(&mut self, elem: T) {\n    let new_tail = Rc::new(RefCell::new(Node { elem, prev: None, next: None }));\n    match self.tail.take() {\n        Some(old_tail) => {\n            old_tail.borrow_mut().next = Some(new_tail.clone());\n            new_tail.borrow_mut().prev = Some(old_tail);\n            self.tail = Some(new_tail);\n        }\n        None => {\n            self.head = Some(new_tail.clone());\n            self.tail = Some(new_tail);\n        }\n    }\n}\n\npub fn pop_back(&mut self) -> Option<T> {\n    self.tail.take().map(|old_tail| {\n        match old_tail.borrow_mut().prev.take() {\n            Some(new_tail) => {\n                new_tail.borrow_mut().next.take();\n                self.tail = Some(new_tail);\n            }\n            None => {\n                self.head.take();\n            }\n        }\n        Rc::try_unwrap(old_tail).ok().unwrap().into_inner().elem\n    })\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The `_mut` peek variants exist because mutable access through a RefCell is a different guard type. `borrow_mut()` returns `RefMut<'_, T>`, which is exclusive. `RefMut::map` projects it the same way `Ref::map` does for shared.",
          "dynamic": "For mutable peeks, `RefMut<T>` is the writing guard — the runtime equivalent of `&mut T`. Same projection trick with `RefMut::map`."
        },
        "code": "use std::cell::RefMut;\n\npub fn peek_back(&self) -> Option<Ref<T>> {\n    self.tail.as_ref().map(|n| Ref::map(n.borrow(), |n| &n.elem))\n}\n\npub fn peek_front_mut(&mut self) -> Option<RefMut<T>> {\n    self.head.as_ref().map(|n| RefMut::map(n.borrow_mut(), |n| &mut n.elem))\n}\n\npub fn peek_back_mut(&mut self) -> Option<RefMut<T>> {\n    self.tail.as_ref().map(|n| RefMut::map(n.borrow_mut(), |n| &mut n.elem))\n}",
        "lang": "rust"
      }
    ],
    "tldr": "Back-end methods are the front-end methods with `head`/`tail` and `next`/`prev` swapped. Mutable peeks use `borrow_mut()` and return `RefMut<T>` via `RefMut::map`. No new ideas, just mirror image.",
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-symmetry.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "title": "Iteration",
    "gesture": {
      "systems": "`IntoIter` is trivial — `next` calls `pop_front` and consumes from one end. The other two iterators, `Iter` and `IterMut`, are essentially impossible to write the way the rest of the standard library writes them, because every yielded item would need to carry a live `Ref` or `RefMut` guard.",
      "dynamic": "Three iterators per collection in Rust: by-value, by-shared-reference, by-mutable-reference. The first one is easy because it's just `pop_front` in a loop. The other two are blocked by the same RefCell leak we saw with peek."
    },
    "steps": [
      {
        "prose": {
          "systems": "`IntoIter` wraps the list and delegates `Iterator::next` to `pop_front`. `DoubleEndedIterator::next_back` calls `pop_back`. Each call walks one end, ending when the list is empty.",
          "dynamic": "By-value iteration just consumes the list one element at a time. We already have `pop_front` and `pop_back`, so wrap them. As a bonus we get `DoubleEndedIterator` for free — the deque can be drained from either end."
        },
        "code": "pub struct IntoIter<T>(List<T>);\n\nimpl<T> List<T> {\n    pub fn into_iter(self) -> IntoIter<T> { IntoIter(self) }\n}\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> { self.0.pop_front() }\n}\n\nimpl<T> DoubleEndedIterator for IntoIter<T> {\n    fn next_back(&mut self) -> Option<T> { self.0.pop_back() }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Iter<T>` would want to yield `&T`. To produce one, it'd need to call `borrow()` on the current node's RefCell, then return a reference into it. But the `Ref` guard has to outlive the reference, and `Iterator::next` returns a value, not a guard — there is nowhere for the guard to live. You can yield `Ref<T>` instead, but then you've broken the `Iterator` trait's idiomatic shape and every consumer pays the price.",
          "dynamic": "By-reference iteration wants to yield `&T` for each element. Through a RefCell, you can only yield through a `Ref`, and the `Ref` has to be held somewhere for as long as the reference is in use. `Iterator::next` returns one value per call — there's no slot for the guard to live in. The trait doesn't accommodate this, and there's no clean fix."
        },
        "code": "// What you'd want — does not work cleanly:\n// impl<'a, T> Iterator for Iter<'a, T> {\n//     type Item = &'a T;          // can't: needs a Ref guard somewhere\n//     fn next(&mut self) -> Option<&'a T> { ... }\n// }\n//\n// What you can do — leaks RefCell into the iterator API too:\n// impl<T> Iterator for Iter<T> {\n//     type Item = Ref<T>;          // every consumer now imports std::cell::Ref\n//     ...\n// }",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`IterMut` is worse: it would need a live `RefMut` guard per node, and walking the list would require holding a `RefMut` for the *current* node while reaching into its `next` link to get to the *next* node — which itself requires another `RefMut` on the same chain. The runtime borrow checker would either panic or you'd have to architect around it with `mem::replace` and `Rc::clone`. We won't write it; the takeaway is that `Rc<RefCell<T>>` is the wrong primitive for an iterating collection.",
          "dynamic": "Mutable iteration is even more cursed. To walk from one node to the next you'd need a write guard on the current node *and* a way to grab the next link out of it without breaking the chain. The runtime checks make this awkward in ways that aren't worth solving — at this point we're admitting the design is bad and moving on."
        },
        "code": "// We don't implement Iter or IterMut. The design can't support them\n// without leaking Ref<T>/RefMut<T> into every caller's signature.\n// In practice this is the moment you decide Rc<RefCell<T>> is the\n// wrong representation for a deque.",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`IntoIter` is `pop_front` plus `pop_back` for `DoubleEndedIterator`. `Iter` and `IterMut` can't be written cleanly because each yielded reference would require a live `Ref`/`RefMut` guard, and `Iterator::next` has nowhere to put it. This is a hard structural limit of `Rc<RefCell<T>>`.",
      "dynamic": "By-value iteration is trivial. By-reference and by-mutable-reference iteration are blocked: every reference would need a runtime guard alive somewhere, and the `Iterator` trait gives you nowhere to keep it. The collection can't implement the standard iteration interface."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-iteration.html"
  },
  {
    "chapterId": "fourth",
    "chapterNum": 4,
    "chapterTitle": "A Bad Safe Deque",
    "title": "Final Code",
    "gesture": {
      "systems": "Here's the whole module. It compiles, it passes basic tests, and you would never use it. The borrow checks are runtime, the error mode is panic, the API leaks `Ref<T>`, and `Iter`/`IterMut` are unimplementable. Chapter 5 starts over with raw pointers.",
      "dynamic": "The complete safe deque. It works, but every operation pays for an Rc count and a RefCell flag check, peeks return guard objects instead of references, and you can't iterate it normally. The next chapter throws this design away and starts over with unsafe pointers."
    },
    "steps": [
      {
        "prose": {
          "systems": "All in one place. Note what you don't see: no `unsafe`, no raw pointers, no manual `Drop`. The Rc graph cleans itself up because a doubly-linked list has no cycles between its endpoints — when the list drops, the head Rc decrements, which drops the next link, which decrements the next Rc, and so on.",
          "dynamic": "The full module, no unsafe anywhere. Cleanup happens automatically: dropping the list drops the head Rc, which (when the count reaches zero) drops the node, which drops *its* `next` link, and so on down the chain. Same drop-chain stack risk as Chapter 1, in principle, but acceptable for a teaching example."
        },
        "code": "use std::cell::{Ref, RefCell, RefMut};\nuse std::rc::Rc;\n\npub struct List<T> {\n    head: Link<T>,\n    tail: Link<T>,\n}\n\ntype Link<T> = Option<Rc<RefCell<Node<T>>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n    prev: Link<T>,\n}\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None, tail: None }\n    }\n\n    pub fn push_front(&mut self, elem: T) {\n        let new_head = Rc::new(RefCell::new(Node { elem, prev: None, next: None }));\n        match self.head.take() {\n            Some(old_head) => {\n                old_head.borrow_mut().prev = Some(new_head.clone());\n                new_head.borrow_mut().next = Some(old_head);\n                self.head = Some(new_head);\n            }\n            None => {\n                self.tail = Some(new_head.clone());\n                self.head = Some(new_head);\n            }\n        }\n    }\n\n    pub fn pop_front(&mut self) -> Option<T> {\n        self.head.take().map(|old_head| {\n            match old_head.borrow_mut().next.take() {\n                Some(new_head) => {\n                    new_head.borrow_mut().prev.take();\n                    self.head = Some(new_head);\n                }\n                None => { self.tail.take(); }\n            }\n            Rc::try_unwrap(old_head).ok().unwrap().into_inner().elem\n        })\n    }\n\n    pub fn push_back(&mut self, elem: T) {\n        let new_tail = Rc::new(RefCell::new(Node { elem, prev: None, next: None }));\n        match self.tail.take() {\n            Some(old_tail) => {\n                old_tail.borrow_mut().next = Some(new_tail.clone());\n                new_tail.borrow_mut().prev = Some(old_tail);\n                self.tail = Some(new_tail);\n            }\n            None => {\n                self.head = Some(new_tail.clone());\n                self.tail = Some(new_tail);\n            }\n        }\n    }\n\n    pub fn pop_back(&mut self) -> Option<T> {\n        self.tail.take().map(|old_tail| {\n            match old_tail.borrow_mut().prev.take() {\n                Some(new_tail) => {\n                    new_tail.borrow_mut().next.take();\n                    self.tail = Some(new_tail);\n                }\n                None => { self.head.take(); }\n            }\n            Rc::try_unwrap(old_tail).ok().unwrap().into_inner().elem\n        })\n    }\n\n    pub fn peek_front(&self) -> Option<Ref<T>> {\n        self.head.as_ref().map(|n| Ref::map(n.borrow(), |n| &n.elem))\n    }\n    pub fn peek_back(&self) -> Option<Ref<T>> {\n        self.tail.as_ref().map(|n| Ref::map(n.borrow(), |n| &n.elem))\n    }\n    pub fn peek_front_mut(&mut self) -> Option<RefMut<T>> {\n        self.head.as_ref().map(|n| RefMut::map(n.borrow_mut(), |n| &mut n.elem))\n    }\n    pub fn peek_back_mut(&mut self) -> Option<RefMut<T>> {\n        self.tail.as_ref().map(|n| RefMut::map(n.borrow_mut(), |n| &mut n.elem))\n    }\n}\n\npub struct IntoIter<T>(List<T>);\n\nimpl<T> List<T> {\n    pub fn into_iter(self) -> IntoIter<T> { IntoIter(self) }\n}\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> { self.0.pop_front() }\n}\n\nimpl<T> DoubleEndedIterator for IntoIter<T> {\n    fn next_back(&mut self) -> Option<T> { self.0.pop_back() }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Why you wouldn't ship this: every operation pays for two atomic-ish ops on the Rc count plus a non-atomic borrow flag flip on the RefCell. Errors that should be compile failures are runtime panics. The peek API leaks `Ref<T>`. There is no `Iter` or `IterMut`. And cycles — which a real circular deque might want — are leaked, because Rc can't collect them.",
          "dynamic": "Why this design fails in practice: every push and pop flips at least four runtime counters; mistakes panic instead of failing to compile; the type signatures advertise our internal storage; you can't iterate by reference. None of those are deal-breakers individually. Together they are. Chapter 5 throws all of this out."
        },
        "code": "// Costs of every operation, roughly:\n// - 1+ Rc clone/drop  (refcount +/- per neighbour pointer)\n// - 1+ RefCell borrow (runtime flag check, panics on violation)\n// - 1 heap allocation for push, 1 free for pop\n// Compare to the unsafe queue in Chapter 5, which is just a couple of\n// raw-pointer writes and a Box allocation.",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "A working safe doubly-linked deque using `Rc<RefCell<Node<T>>>`. It compiles without `unsafe` but pays runtime overhead per operation, panics on aliasing bugs, leaks `Ref<T>` through the peek API, and cannot implement by-reference iteration. The right answer is raw pointers, which is the next chapter.",
      "dynamic": "We built a 100% safe doubly-linked list. It works. It is also slow per-op, panics instead of refusing to compile, exposes its storage type in its public API, and can't be iterated by reference. This is what `Rc<RefCell<T>>` gets you when you push it past its sweet spot. Chapter 5 uses unsafe pointers instead."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fourth-final.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "chapterIntro": "A queue needs O(1) push at the back and O(1) pop at the front. That means two pointers into the same chain — a head we own and a tail we also need to reach. Safe Rust will not let one chain be owned twice, so this chapter is where we earn the `unsafe` keyword. Along the way we meet Miri, stacked borrows, and the rules you have to obey when you hold a raw pointer.",
    "editionNotes": [
      {
        "edition": "2021",
        "body": "Everything here compiles on Rust 2021. The raw-pointer idioms (`Box::into_raw`, `Box::from_raw`, `*mut T`, `ptr::null_mut`) have been stable since 1.0. `addr_of_mut!` was stabilized in 1.51 and works on 2021."
      },
      {
        "edition": "2024",
        "body": "Rust 2024 leans harder on strict provenance. The pattern `&mut x as *mut _` produces a reference and immediately casts it, which is exactly the mix-and-match that stacked borrows hates. Prefer `&raw mut x` (or `addr_of_mut!(x)` on older toolchains) — these produce a raw pointer without ever creating a reference."
      }
    ],
    "title": "Layout",
    "gesture": {
      "systems": "Push to the back is the operation that breaks safe ownership. The head owns a `Box<Node>` chain; the tail needs a second pointer into the last node of that same chain. Two `Box`es to the same allocation is a double-free. The escape hatch is `*mut Node<T>` — a raw pointer that doesn't own anything and doesn't participate in borrow checking.",
      "dynamic": "A queue is a line: people join at the back, people leave at the front. To add to the back in constant time we need to remember where the back is. But Rust's ownership rules say one piece of memory has one owner — and the head of the list already owns the whole chain. So the tail can't be another owner. It has to be a *raw pointer*: an address with no ownership and no compiler-checked rules. That's what `unsafe` will let us touch."
    },
    "steps": [
      {
        "prose": {
          "systems": "First the obvious-but-wrong layout: head and tail both as `Option<Box<Node>>`. The compiler accepts the type but the semantics are broken — once you push three items, the second `Box` aliases memory the first one already owns. On drop you free the same allocation twice.",
          "dynamic": "The first thing you might try: store the head as a `Box` and the tail as another `Box` pointing at the last node. Rust will let you write the type, but it's wrong. A `Box` *owns* what it points at; if both head and tail own the last node, when the queue drops, the same memory is freed twice. That's a use-after-free bug waiting to happen — and it's exactly what Rust's ownership rules exist to prevent."
        },
        "code": "// broken — do not write this\npub struct List<T> {\n    head: Link<T>,\n    tail: Link<T>,   // aliases head's chain — double-free on drop\n}\n\ntype Link<T> = Option<Box<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The fix is a raw pointer. `*mut Node<T>` is exactly what `Node*` is in C: an address, no provenance check at runtime, no ownership semantics, no `Drop`. The head still owns the chain via `Box`; the tail is a borrow-the-address-and-trust-me back-channel into the same memory. Initialize it to `null_mut()` and update it on every `push_back`.",
          "dynamic": "A raw pointer in Rust is written `*mut T` (mutable) or `*const T` (read-only). It's a number that points at memory. It does not own that memory, the compiler does not check borrows on it, and dropping it does nothing. So we let the head keep ownership of the chain via `Box`, and we let the tail be a `*mut Node<T>` that the head's chain promises to keep alive. The `null_mut()` value plays the role of `None` — a pointer that points nowhere."
        },
        "code": "use std::ptr;\n\npub struct List<T> {\n    head: Link<T>,\n    tail: *mut Node<T>,   // raw pointer — does not own\n}\n\ntype Link<T> = Option<Box<Node<T>>>;\n\nstruct Node<T> {\n    elem: T,\n    next: Link<T>,\n}\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: None, tail: ptr::null_mut() }\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Two owners of one allocation is a double-free. Keep the head as `Option<Box<Node<T>>>` and demote the tail to `*mut Node<T>` — a raw pointer with no ownership, initialized to `ptr::null_mut()`.",
      "dynamic": "A queue needs head and tail; both can't own the chain. Head owns via `Box`; tail is a raw pointer (`*mut Node<T>`), which is just an address with no ownership rules. `null_mut()` is the empty value."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-layout.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Unsafe",
    "gesture": {
      "systems": "`unsafe` is not a magic word that turns off the borrow checker. It enables exactly five operations that the compiler can't prove sound: dereferencing raw pointers, calling unsafe functions, mutating statics, implementing unsafe traits, and reading union fields. Aliasing rules, lifetime rules, and the abstract machine still apply. You're promising to uphold them yourself.",
      "dynamic": "People hear `unsafe` and assume it means \"now Rust is C.\" It does not. `unsafe` unlocks five specific powers — the most relevant being \"dereference a raw pointer\" — and that's all. Every other rule still holds. If you make a mistake, the compiler can no longer catch it, but the *language's contract* is not relaxed. You are now responsible for not breaking it."
    },
    "steps": [
      {
        "prose": {
          "systems": "The five superpowers, in canonical order: deref `*mut T` / `*const T`, call `unsafe fn`, access `static mut`, implement `unsafe trait`, access fields of a `union`. Anything else inside an `unsafe` block is checked exactly as it would be in safe Rust.",
          "dynamic": "Inside `unsafe { ... }` you get five new abilities and nothing more. The one we'll use is dereferencing raw pointers. The other four exist for FFI, for esoteric concurrency primitives, and for compiler-level traits. Most code in production Rust never touches them."
        },
        "code": "unsafe {\n    let p: *mut i32 = some_raw_pointer();\n    let v = *p;          // 1. dereference raw pointer\n    do_unsafe_thing();   // 2. call unsafe fn\n    // 3. static mut\n    // 4. impl unsafe trait\n    // 5. union field access\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The contract `unsafe` does not relax: you still cannot have a `&mut T` aliased by another `&` or `&mut` to the same memory at the same time. You still cannot produce a dangling reference, even briefly. Stacked borrows formalizes \"at the same time\" — coming up two sections from now.",
          "dynamic": "Crucially: `unsafe` does *not* let you get away with aliasing violations. If you make a `&mut T` and a `*mut T` that point at the same memory and use them in the wrong order, your program has *undefined behavior* — the compiler is allowed to assume that situation never happens, and may optimize as if your code did something else entirely. The compiler won't tell you. The output will just be wrong, sometimes."
        },
        "code": "// safe code, undefined behavior:\nlet mut x = 0i32;\nlet r: &mut i32 = &mut x;\nlet p: *mut i32 = r as *mut i32;\nunsafe {\n    *p = 1;        // OK — derived from r, r still active\n    *r = 2;        // OK\n    *p = 3;        // UB — using p after writing through r invalidates p\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`unsafe` adds five capabilities — most importantly raw-pointer deref. It does not relax aliasing, lifetime, or validity rules. You are now the prover.",
      "dynamic": "`unsafe` is not \"turn off the rules.\" It's \"let me deref a raw pointer; I will personally guarantee I'm not breaking the other rules.\" The compiler stops helping; the rules don't change."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-unsafe.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Basics",
    "gesture": {
      "systems": "First pass at `push` and `pop`. We keep the `Box`-owned chain and update `tail` whenever we extend the back. The compiler is happy. The program is wrong, but not in a way the compiler will diagnose.",
      "dynamic": "Time to write `push_back` and `pop_front`. Both are short. Both compile. One of them will quietly contain undefined behavior because we're going to pass through both a `&mut` reference and a `*mut` pointer to the same node. The compiler accepts it. The program is technically broken from this point forward — we just can't see it yet."
    },
    "steps": [
      {
        "prose": {
          "systems": "`push_back` allocates a node, stashes its address in a local `*mut`, then either splices it onto the empty list or hangs it off the previous tail. The deref of `self.tail` (when nonempty) requires `unsafe`.",
          "dynamic": "To push, build a new node. If the list is empty, set the head to it. Otherwise, the current tail's `next` becomes the new node. Either way, `self.tail` is updated to point at the new node. The line that pokes through the old tail's raw pointer needs an `unsafe` block — that's the deref."
        },
        "code": "pub fn push_back(&mut self, elem: T) {\n    let mut new_node = Box::new(Node { elem, next: None });\n    let raw_tail: *mut Node<T> = &mut *new_node;\n\n    if self.tail.is_null() {\n        self.head = Some(new_node);\n    } else {\n        unsafe { (*self.tail).next = Some(new_node); }\n    }\n    self.tail = raw_tail;\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`pop_front` is the safe-Rust pop from chapter 2 with one extra wrinkle: when we pop the *last* node, `self.tail` becomes a dangling pointer to freed memory. Reset it to null in that case.",
          "dynamic": "Pop takes the head out, advances `self.head` to the popped node's `next`, and returns the element. New wrinkle: if the popped node was also the tail, we just freed the memory `self.tail` was pointing at. Set `self.tail` back to null in that case so the next `push_back` re-initializes it."
        },
        "code": "pub fn pop_front(&mut self) -> Option<T> {\n    self.head.take().map(|head| {\n        let head = *head;\n        self.head = head.next;\n        if self.head.is_none() {\n            self.tail = ptr::null_mut();\n        }\n        head.elem\n    })\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "It compiles, runs, passes a hand-written test. The bug is in `push_back`: `&mut *new_node` produces a `&mut Node<T>`, we cast it to `*mut Node<T>`, then we move `new_node` into `self.head` or into the previous tail's `next`. The act of moving the box invalidates outstanding references derived from it, and the next deref of `raw_tail` is reading through a stale tag.",
          "dynamic": "The code compiles, the tests pass, you ship it. The bug: `&mut *new_node` makes a temporary `&mut` reference to the node. We cast that reference to a raw pointer. Then we move the `Box` into the list. Moving the box is, conceptually, like writing through the box again — and the rules say that invalidates any older references to its contents. The raw pointer we just stored in `self.tail` is now \"derived from a reference that's no longer the active one,\" which is undefined behavior. Cargo won't tell you. We need a different tool."
        },
        "code": "let mut q = List::new();\nq.push_back(1);\nq.push_back(2);\nq.push_back(3);\nassert_eq!(q.pop_front(), Some(1));\nassert_eq!(q.pop_front(), Some(2));\nassert_eq!(q.pop_front(), Some(3));\nassert_eq!(q.pop_front(), None);\n// passes. and yet.",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "First-pass `push_back`/`pop_front` compiles and passes tests. The `&mut *new_node` cast to `*mut` followed by moving the box is a stacked-borrows violation — UB the compiler can't see.",
      "dynamic": "The naive queue compiles and the tests pass. There's still a bug: we made a `&mut` reference to a box's contents, cast it to a raw pointer, then moved the box. That sequence is undefined behavior in Rust's memory model, even though the code looks fine."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-basics.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Miri",
    "gesture": {
      "systems": "Miri is a Rust interpreter for MIR — the compiler's mid-level IR. It runs your program's tests one MIR statement at a time, with full provenance tracking, and screams the moment you violate the abstract machine. It's the only tool that will catch the bug from the previous section.",
      "dynamic": "Miri is a special interpreter that runs your Rust code very slowly, but with eyes everywhere. It tracks the *meaning* of every pointer — where it came from, what it's allowed to access — and stops the program with a precise error if you ever violate the rules of Rust's abstract machine. It's how you find UB that `cargo test` cannot."
    },
    "steps": [
      {
        "prose": {
          "systems": "Miri ships as a rustup component on the nightly toolchain. Install once, then `cargo +nightly miri test` runs your test suite under Miri. It is slow — expect 50–500x slowdown — but it is exhaustive.",
          "dynamic": "Install Miri with `rustup component add miri --toolchain nightly`. Then run your tests under Miri with `cargo +nightly miri test`. The first run takes a while because Miri has to interpret the standard library too. After that, tests run a few hundred times slower than normal — which is fine, because you only run Miri when you're checking for memory bugs, not on every save."
        },
        "code": "$ rustup toolchain install nightly\n$ rustup +nightly component add miri\n$ cargo +nightly miri test",
        "lang": "bash"
      },
      {
        "prose": {
          "systems": "Run it against the previous section's queue. Miri flags the first deref of `self.tail` after the box has been moved, with a stacked-borrows trace pointing at the offending tag.",
          "dynamic": "Run it against the queue we just wrote. Miri stops at exactly the line we suspected and prints a stacked-borrows error: a tag was popped off the borrow stack, and the raw pointer trying to use it is no longer permitted to. The error is verbose but precise — it names the tag, the operation that invalidated it, and the operation that tried to use it after."
        },
        "code": "error: Undefined Behavior: trying to retag from <1234> for SharedReadWrite\n  permission, but that tag does not exist in the borrow stack for this location\n  --> src/lib.rs:23:13\n   |\n23 |   unsafe { (*self.tail).next = Some(new_node); }\n   |            ^^^^^^^^^^^^^^^^\n   |            |\n   |            trying to retag from <1234> for SharedReadWrite permission\n   |            <1234> was created by a SharedReadWrite retag at offsets [0..24]\n   = help: this indicates a potential bug in the program: it performed an\n           invalid operation, but the rules it violated are still experimental",
        "lang": "text"
      },
      {
        "prose": {
          "systems": "Miri does not just run on tests — it runs on any binary or example. Use `MIRIFLAGS=\"-Zmiri-tree-borrows\"` to switch from stacked borrows to the newer tree-borrows model; some programs that fail under stacked borrows pass under tree borrows and vice versa. The lesson: write code that satisfies *both*.",
          "dynamic": "Miri can run examples and binaries too, not just tests. There are also two memory models you can ask it to enforce: the default *stacked borrows* and the newer *tree borrows*. They disagree on edge cases. The safe rule: write code that passes under both, by sticking to canonical raw-pointer patterns rather than clever casts."
        },
        "code": "$ cargo +nightly miri test                            # stacked borrows (default)\n$ MIRIFLAGS=\"-Zmiri-tree-borrows\" cargo +nightly miri test  # tree borrows",
        "lang": "bash"
      }
    ],
    "tldr": {
      "systems": "Miri is a MIR interpreter that catches UB at runtime: install via `rustup component add miri`, run with `cargo +nightly miri test`. It will flag the previous section's reference-then-move bug exactly.",
      "dynamic": "Miri is a slow, careful interpreter that catches the memory bugs `cargo test` misses. Install on nightly, run with `cargo +nightly miri test`. It will tell you precisely which line of the previous section's queue is broken."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-miri.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Stacked Borrows",
    "gesture": {
      "systems": "Stacked borrows is the operational semantics behind Rust's aliasing rules. Conceptually similar to TBAA-meets-restrict: every reference and raw pointer carries a tag, every memory location maintains a stack of currently-valid tags, and any access by tag X pops everything above X. If your tag has been popped, your access is UB. Tree borrows is a refinement that organizes tags as a tree rather than a stack — it permits some patterns stacked borrows rejects and rejects some it permits.",
      "dynamic": "Stacked borrows is a model for explaining what counts as a real Rust program and what counts as a bug. Imagine every borrow you make gets a numbered ticket. Each piece of memory has a stack of tickets — the topmost is the only one allowed to access it right now. When you create a new borrow, you push a new ticket on top. When you use an *older* ticket, the model pops everything above it off the stack. If your ticket has been popped, you're not allowed to use it. Tree borrows is a newer version of the same idea, where the tickets form a tree rather than a stack — slightly more permissive in some places, slightly stricter in others."
    },
    "steps": [
      {
        "prose": {
          "systems": "Make a `&mut`, take its address as `*mut`, write through the raw pointer, then write through the `&mut` again — that last write pops the raw pointer's tag. Subsequent use of the raw pointer is UB. The fix is to use `addr_of_mut!` (or `&raw mut`) to get a raw pointer that doesn't go through a reference at all, so its tag has no parent reference to invalidate it.",
          "dynamic": "Concretely: if you make a reference, then a raw pointer from that reference, then write through the reference, the raw pointer is no longer valid. The way around it is to bypass the reference: `addr_of_mut!(x)` gives you a raw pointer to `x` *without* creating a reference first. Same for the helper macro `&raw mut x` (when available)."
        },
        "code": "// stacked borrows mental model:\n// stack at addr(x): [root]                <- nothing borrowed yet\n// let r = &mut x;\n// stack at addr(x): [root, r_tag]         <- r tag pushed\n// let p = r as *mut i32;\n// stack at addr(x): [root, r_tag, p_tag]  <- p derived from r\n// *r = 5;                                   <- writes via r_tag, pops p_tag\n// stack at addr(x): [root, r_tag]\n// *p = 6;                                   <- p_tag is gone -> UB",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The discipline this implies: pick *one* path to the memory and stick with it for the duration. If you need a raw pointer for the long haul, build it with `addr_of_mut!` so it doesn't sit on top of a reference whose lifetime you'll outlive.",
          "dynamic": "The takeaway: don't mix and match references and raw pointers to the same memory. Pick one. If you need a long-lived raw pointer (like our `tail`), get it directly without ever making a reference, and only deref it inside `unsafe` blocks where you know no live `&mut` exists."
        },
        "code": "use std::ptr::addr_of_mut;\n\nlet mut x = 0i32;\nlet p: *mut i32 = addr_of_mut!(x);   // no reference created\nunsafe {\n    *p = 1;\n    *p = 2;\n}\n// no UB — there was never a competing reference",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Every reference/raw pointer carries a tag; every memory cell tracks a stack of valid tags; using an earlier tag pops everything above it. To hold a long-lived raw pointer, derive it via `addr_of_mut!` so no parent reference can pop it later. Tree borrows is the same idea reorganized as a tree.",
      "dynamic": "Each borrow you make is a ticket. Memory remembers a stack of tickets; using an older one pops younger ones. So mixing `&mut` and `*mut` to the same memory is a foot-gun. Use `addr_of_mut!` to get a raw pointer without making a reference first."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-stacked-borrows.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Testing Stacked Borrows",
    "gesture": {
      "systems": "Two minimal examples to internalize the model: the bad pattern (reference begets raw pointer; reference is reused; raw pointer is then UB) and the good pattern (raw pointer obtained via `addr_of_mut!` lives independently of any reference).",
      "dynamic": "Two short programs to see the rule in action — one that Miri rejects, one that Miri accepts. They're almost identical. The difference is whether the raw pointer was born from a reference or from `addr_of_mut!`."
    },
    "steps": [
      {
        "prose": {
          "systems": "Bad. The `r as *mut i32` cast is shorthand for \"reference, then erase to raw\" — same provenance, derived from `r`. Subsequent write through `r` invalidates `p`.",
          "dynamic": "Here's the bad version. Make a `&mut`, cast it to `*mut`, write through the `&mut`, then try to use the raw pointer. Miri stops the program."
        },
        "code": "fn bad() {\n    let mut x = 0i32;\n    let r = &mut x;\n    let p = r as *mut i32;   // p derived from r\n    *r = 1;                  // re-using r pops p\n    unsafe { *p = 2; }       // UB — p's tag is gone\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Good. `addr_of_mut!(x)` does not produce a reference; the resulting raw pointer is rooted at `x` itself. No `&mut` exists to compete with it. Writes through `p` are sound as long as no overlapping reference is live.",
          "dynamic": "Good version. `addr_of_mut!(x)` gives you a raw pointer to `x` that was never a reference. There's nothing to invalidate it. Writes are fine, as long as you don't simultaneously have a `&mut` to the same place."
        },
        "code": "use std::ptr::addr_of_mut;\n\nfn good() {\n    let mut x = 0i32;\n    let p = addr_of_mut!(x);   // raw pointer with no parent reference\n    unsafe {\n        *p = 1;\n        *p = 2;\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Same lesson for slices and boxes: `slice.as_mut_ptr()` gives you a raw pointer rooted at the slice's storage without manufacturing a `&mut [T]` for it. `Box::into_raw(b)` consumes the `Box` and returns a `*mut T` that owns nothing — the canonical move from owned to raw.",
          "dynamic": "Same idea applies to other containers. `slice.as_mut_ptr()` gives a raw pointer to the slice's data without making a `&mut` first. `Box::into_raw(b)` turns a `Box` into a raw pointer (consuming the box, so there's no owner left to compete) — that's the trick we'll use in the redux section."
        },
        "code": "let mut v: Vec<u8> = vec![1, 2, 3];\nlet p: *mut u8 = v.as_mut_ptr();  // OK, rooted at the vec's buffer\n\nlet b: Box<i32> = Box::new(42);\nlet p: *mut i32 = Box::into_raw(b);  // box is gone; p owns the heap slot",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Don't manufacture a raw pointer from a reference and then keep using both. Use `addr_of_mut!`, `as_mut_ptr`, or `Box::into_raw` to get a raw pointer with no parent reference.",
      "dynamic": "If you need a long-lived raw pointer, get it without making a reference first: `addr_of_mut!`, `as_mut_ptr`, or `Box::into_raw`. Mixing references and raw pointers to the same memory is the bug pattern."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-testing-stacked-borrows.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Layout + Basics Redux",
    "gesture": {
      "systems": "Rewrite the layout with raw pointers throughout: head and tail are both `*mut Node<T>`. Allocate via `Box::new` then immediately `Box::into_raw`; deallocate via `Box::from_raw` and let the box drop. There are no `Box`-owned references in flight, so there's nothing for stacked borrows to pop.",
      "dynamic": "Restart the layout. Both `head` and `tail` are now raw pointers — no `Box` in the queue at all. We allocate by calling `Box::new` then immediately handing the box's address to `Box::into_raw`, which gives us a raw pointer and forgets the box. We free by reversing it: `Box::from_raw` turns a raw pointer back into a `Box`, and dropping the `Box` frees the memory. In between, there's nothing but raw pointers — no references for the borrow model to track."
    },
    "steps": [
      {
        "prose": {
          "systems": "New layout. Both fields are `*mut Node<T>`. `Drop` is now mandatory — without `Box`-owned children, the chain doesn't free itself.",
          "dynamic": "The struct is just two raw pointers. Empty queue: both null. Note that with no `Box` in the layout, *nothing* will free the memory automatically. We'll have to write `Drop` ourselves."
        },
        "code": "use std::ptr;\n\npub struct List<T> {\n    head: *mut Node<T>,\n    tail: *mut Node<T>,\n}\n\nstruct Node<T> {\n    elem: T,\n    next: *mut Node<T>,\n}\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: ptr::null_mut(), tail: ptr::null_mut() }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`push_back`: heap-allocate via `Box::new`, hand the address to `Box::into_raw` to dissolve the `Box`, then wire it into the chain. No reference ever exists to the new node.",
          "dynamic": "Push: allocate a node in a `Box`, then call `Box::into_raw` on it. That's the move from owned-on-the-heap to raw-pointer-to-the-heap. We never make a `&mut` to the new node — only a raw pointer. Then we splice it in: empty list means it's the new head; nonempty means the old tail's `next` becomes it."
        },
        "code": "pub fn push_back(&mut self, elem: T) {\n    unsafe {\n        let new_tail = Box::into_raw(Box::new(Node {\n            elem,\n            next: ptr::null_mut(),\n        }));\n\n        if self.tail.is_null() {\n            self.head = new_tail;\n        } else {\n            (*self.tail).next = new_tail;\n        }\n        self.tail = new_tail;\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`pop_front`: reconstitute a `Box` from `self.head` via `Box::from_raw`, take its element, advance `self.head`, and let the `Box` drop. If we just popped the last node, null out `self.tail`.",
          "dynamic": "Pop: if the head is null, return `None`. Otherwise, call `Box::from_raw(self.head)` to turn that raw pointer back into a `Box` we own, take the element out, advance `self.head` to the popped node's `next`, and let the box drop at the end of the function — that frees the node. If `self.head` is now null we also reset `self.tail`."
        },
        "code": "pub fn pop_front(&mut self) -> Option<T> {\n    unsafe {\n        if self.head.is_null() {\n            None\n        } else {\n            let head_box: Box<Node<T>> = Box::from_raw(self.head);\n            self.head = head_box.next;\n            if self.head.is_null() {\n                self.tail = ptr::null_mut();\n            }\n            Some(head_box.elem)\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Drop` walks the chain by repeatedly popping. Each `pop_front` reconstitutes and drops one node; the loop terminates when `head` is null. For a list of `T: !Copy` non-trivially-destructible elements, `Box<Node<T>>::drop` runs the inner `T`'s destructor too — `drop_in_place` semantics, paid for transparently by the box.",
          "dynamic": "Destructor: just call `pop_front` in a loop until it returns `None`. Each pop frees one node. When the loop exits, the queue is empty and the struct itself can be dropped without touching memory.",
          "systems2": ""
        },
        "code": "impl<T> Drop for List<T> {\n    fn drop(&mut self) {\n        while self.pop_front().is_some() {}\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Run Miri. Stacked borrows: clean. Tree borrows: clean. The discipline is paying for itself: there is exactly one path to each node (the chain of raw pointers), and the only references that ever exist are short-lived ones inside method bodies that don't outlive their `unsafe` block. **2024 edition note:** prefer `&raw mut` over `&mut x as *mut _` if you ever need a one-off raw pointer to a local — it's the strict-provenance idiom Rust 2024 nudges you toward.",
          "dynamic": "Run Miri now. Both stacked borrows and tree borrows accept the program. The reason: every reference to a node lives entirely inside one method call and dies before any other code runs. The long-lived pointers are all raw, and they came from `Box::into_raw`, which had no reference to invalidate. **A note on Rust 2024:** if you ever need a quick raw pointer to a local variable, the modern way is `&raw mut x` rather than `&mut x as *mut _`. The old form briefly creates a reference; the new form does not."
        },
        "code": "$ cargo +nightly miri test\nrunning 4 tests\ntest queue::tests::push_pop ... ok\ntest queue::tests::peek      ... ok\ntest queue::tests::iter      ... ok\ntest queue::tests::drop_long ... ok\n\ntest result: ok. 4 passed; 0 failed",
        "lang": "bash"
      }
    ],
    "tldr": {
      "systems": "All-raw-pointer layout, allocate with `Box::into_raw`, free with `Box::from_raw`, hand-written `Drop` that loops `pop_front`. No long-lived references means stacked borrows has nothing to pop. Miri passes under both models.",
      "dynamic": "Strip the `Box` out of the layout. Allocate by `Box::new` + `Box::into_raw`, free by `Box::from_raw` + drop. Write `Drop` as a `while pop_front`. No references survive between method calls, so there's nothing for the borrow model to invalidate. Miri now passes."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-layout-basics-redux.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Extras",
    "gesture": {
      "systems": "With the layout right, the rest is mechanical: `peek_front`, `peek_back`, `is_empty`, an `Iter` and `IterMut`. Most are one-line `unsafe` blocks that produce a short-lived reference from a raw pointer.",
      "dynamic": "The hard part is done. Peeks, length, emptiness, and iteration are all variations of the same theme: convert a raw pointer to a short-lived reference inside `unsafe`, return it, and let the borrow checker take it from there."
    },
    "steps": [
      {
        "prose": {
          "systems": "Peeks: deref the head/tail raw pointer once and return `Option<&T>`. The lifetime of the returned reference is tied to `&self` by the elision rules, so the borrow checker enforces that the queue isn't mutated while the peek is live.",
          "dynamic": "`peek_front` and `peek_back` return an optional reference to the front/back element. We deref the raw pointer just long enough to grab a reference and return it — Rust ties that reference's lifetime to the borrow of `self`, so the queue can't be modified while the peek is held."
        },
        "code": "pub fn peek_front(&self) -> Option<&T> {\n    unsafe { self.head.as_ref().map(|n| &n.elem) }\n}\n\npub fn peek_back(&self) -> Option<&T> {\n    unsafe { self.tail.as_ref().map(|n| &n.elem) }\n}\n\npub fn is_empty(&self) -> bool {\n    self.head.is_null()\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Iter` holds a `*const Node<T>` cursor and a `PhantomData<&'a T>` to bind the lifetime. `next` reads through the cursor, returns `&'a T`, advances. `IterMut` is the `*mut` analog. Both are short, both pass Miri.",
          "dynamic": "An iterator is a cursor that walks the chain. We store the next node as a raw pointer plus a `PhantomData` so the compiler knows the iterator borrows from the list. Each `next` call dereferences once, returns a reference to the element, and moves the cursor forward."
        },
        "code": "use std::marker::PhantomData;\n\npub struct Iter<'a, T> {\n    next: *const Node<T>,\n    _marker: PhantomData<&'a T>,\n}\n\nimpl<T> List<T> {\n    pub fn iter(&self) -> Iter<'_, T> {\n        Iter { next: self.head, _marker: PhantomData }\n    }\n}\n\nimpl<'a, T> Iterator for Iter<'a, T> {\n    type Item = &'a T;\n    fn next(&mut self) -> Option<&'a T> {\n        unsafe {\n            self.next.as_ref().map(|node| {\n                self.next = node.next;\n                &node.elem\n            })\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`IntoIter` consumes the queue — wrap the list and yield via `pop_front`. Drop on the wrapper drains the rest. No `unsafe` needed in the iterator itself because all the pointer work is hidden inside `pop_front`.",
          "dynamic": "An owning iterator is even simpler: wrap the list, return `pop_front()` from `next`, and the existing `Drop` cleans up anything left at the end. The iterator code itself doesn't need `unsafe` — `pop_front` handles all the raw-pointer work."
        },
        "code": "pub struct IntoIter<T>(List<T>);\n\nimpl<T> List<T> {\n    pub fn into_iter(self) -> IntoIter<T> { IntoIter(self) }\n}\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> { self.0.pop_front() }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Peeks are a single deref; iterators carry a raw cursor plus `PhantomData` for the lifetime; `IntoIter` is a thin wrapper around `pop_front`. None of it requires touching the borrow model again.",
      "dynamic": "Once the layout is right, peeks and iteration are short. `Iter`/`IterMut` use a raw cursor with a `PhantomData` lifetime tag; `IntoIter` is just `pop_front` in a wrapper."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-extras.html"
  },
  {
    "chapterId": "fifth",
    "chapterNum": 5,
    "chapterTitle": "An Unsafe Queue",
    "title": "Final Code",
    "gesture": {
      "systems": "The whole module in one block. The cost we paid for O(1) `push_back`: a raw-pointer layout, hand-written `Drop`, and the obligation to think about stacked borrows on every modification forever. The benefit: one allocation per push, no `Box` clone of the tail, no shared-ownership overhead. For a queue, it's the right trade.",
      "dynamic": "All of it together. The cost of going `unsafe`: you wrote more code, you have to run Miri before trusting it, and you can't get help from the borrow checker on the internals. The benefit: a real O(1) queue with one allocation per push and no reference-counting. For a data structure that gets used a lot, the trade is usually worth it — but only if you can pay the discipline."
    },
    "steps": [
      {
        "prose": {
          "systems": "The complete unsafe queue. Keep this on hand: in chapter 6 we generalize to a doubly-linked deque, where stacked borrows gets even fussier and we'll switch from raw pointers to `NonNull<T>` plus the same disciplines.",
          "dynamic": "Here it is — the full module. Chapter 6 builds the doubly-linked version, where every node has both a `next` and a `prev` and the stacked-borrows considerations get harder. The patterns from this chapter carry over directly."
        },
        "code": "use std::marker::PhantomData;\nuse std::ptr;\n\npub struct List<T> {\n    head: *mut Node<T>,\n    tail: *mut Node<T>,\n}\n\nstruct Node<T> {\n    elem: T,\n    next: *mut Node<T>,\n}\n\npub struct Iter<'a, T> {\n    next: *const Node<T>,\n    _marker: PhantomData<&'a T>,\n}\n\npub struct IntoIter<T>(List<T>);\n\nimpl<T> List<T> {\n    pub fn new() -> Self {\n        List { head: ptr::null_mut(), tail: ptr::null_mut() }\n    }\n\n    pub fn push_back(&mut self, elem: T) {\n        unsafe {\n            let new_tail = Box::into_raw(Box::new(Node {\n                elem,\n                next: ptr::null_mut(),\n            }));\n            if self.tail.is_null() {\n                self.head = new_tail;\n            } else {\n                (*self.tail).next = new_tail;\n            }\n            self.tail = new_tail;\n        }\n    }\n\n    pub fn pop_front(&mut self) -> Option<T> {\n        unsafe {\n            if self.head.is_null() {\n                None\n            } else {\n                let head_box: Box<Node<T>> = Box::from_raw(self.head);\n                self.head = head_box.next;\n                if self.head.is_null() {\n                    self.tail = ptr::null_mut();\n                }\n                Some(head_box.elem)\n            }\n        }\n    }\n\n    pub fn peek_front(&self) -> Option<&T> {\n        unsafe { self.head.as_ref().map(|n| &n.elem) }\n    }\n\n    pub fn peek_back(&self) -> Option<&T> {\n        unsafe { self.tail.as_ref().map(|n| &n.elem) }\n    }\n\n    pub fn is_empty(&self) -> bool {\n        self.head.is_null()\n    }\n\n    pub fn iter(&self) -> Iter<'_, T> {\n        Iter { next: self.head, _marker: PhantomData }\n    }\n\n    pub fn into_iter(self) -> IntoIter<T> { IntoIter(self) }\n}\n\nimpl<'a, T> Iterator for Iter<'a, T> {\n    type Item = &'a T;\n    fn next(&mut self) -> Option<&'a T> {\n        unsafe {\n            self.next.as_ref().map(|node| {\n                self.next = node.next;\n                &node.elem\n            })\n        }\n    }\n}\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> { self.0.pop_front() }\n}\n\nimpl<T> Drop for List<T> {\n    fn drop(&mut self) {\n        while self.pop_front().is_some() {}\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Working O(1) singly-linked queue with raw-pointer head and tail. Pays the `Box::into_raw`/`Box::from_raw` allocator dance per push/pop and an explicit `Drop`; in return, one allocation per push and no aliasing of owned chains. Verified clean under Miri (stacked borrows + tree borrows).",
      "dynamic": "A complete unsafe queue: `push_back`, `pop_front`, peeks, iter, drop. The price is `unsafe` blocks and a Miri habit. The reward is real O(1) queue operations with one allocation per push and no reference counting."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/fifth-final.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "chapterIntro": "We rebuild std::collections::LinkedList: a generic doubly-linked deque on raw pointers, with the variance, drop-check, panic safety, trait bouquet, and cursor API that a real collection has to ship. This is the chapter where the unsafe-Rust theory from the queue becomes a checklist.",
    "editionNotes": [
      {
        "edition": "2024",
        "body": "Rust 2024 hardened the strict-provenance model: pointer construction now goes through `NonNull::new`, `Box::into_raw`, and `addr_of_mut!`/`&raw mut` rather than casts from references. The patterns in this chapter are written that way already; older code that does `&mut *foo as *mut _` round-trips compiles but produces less defensible provenance under Miri."
      },
      {
        "edition": "2024",
        "body": "Drop check (`#[may_dangle]`) is unstable and not edition-tied, but the compiler's variance and dropck inference is what makes `PhantomData<Box<Node<T>>>` the right marker. Picking the wrong `PhantomData` is the single most common bug in unsafe collections."
      }
    ],
    "title": "Layout",
    "gesture": {
      "systems": "The shape is what you'd write in C: a struct with `front` and `back` node pointers and a length. The Rust differences are the choice of pointer type (`NonNull<Node<T>>` instead of `*mut Node<T>`) and a zero-sized marker field that exists purely to inform the compiler about ownership.",
      "dynamic": "A doubly-linked deque is two pointers — to the first node and the last node — plus a length counter. In a language with garbage collection that's all you'd write. In Rust we have to add one more thing: a marker that tells the compiler how the pointers behave for ownership and lifetime purposes."
    },
    "steps": [
      {
        "prose": {
          "systems": "`NonNull<T>` is `*mut T` plus a guarantee that the bit pattern is never zero. Two consequences: the compiler can apply the null-pointer optimization so `Option<NonNull<T>>` is one pointer wide (the `None` is the all-zero bit pattern), and you opt into covariance over `T` instead of the invariance you'd inherit from `*mut T`. We pay nothing at runtime for either.",
          "dynamic": "`NonNull<T>` is a raw pointer that promises it's never null. That sounds like a small thing, but it earns two big wins. First, `Option<NonNull<T>>` is the same size as a single pointer — the compiler reserves the all-zero bit pattern to mean `None`. Second, it lets us tell the compiler our pointer behaves like an owned value rather than a generic mutable cell."
        },
        "code": "use std::marker::PhantomData;\nuse std::ptr::NonNull;\n\npub struct LinkedList<T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    len: usize,\n    _marker: PhantomData<Box<Node<T>>>,\n}\n\nstruct Node<T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    elem: T,\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`PhantomData<Box<Node<T>>>` is a zero-sized field whose type encodes the lie we want the compiler to believe: this struct *owns* `Node<T>` values on the heap. That gets us the right variance over `T` (covariant) and, crucially, the right dropck signal — the compiler will treat our list as if it owns and drops `Node<T>` when the list is dropped, even though our actual fields are raw pointers.",
          "dynamic": "`PhantomData<X>` is a field that holds nothing at runtime. It exists to lie to the type checker: it says \"pretend this struct contains an `X`\". We pretend our list contains a `Box<Node<T>>` because that's morally what's going on — we own a chain of heap-allocated nodes. The compiler then computes variance and drop-checking as if the boxes were really there."
        },
        "code": "// these are zero bytes at runtime:\nuse std::mem::size_of;\nassert_eq!(size_of::<PhantomData<Box<i32>>>(), 0);\n\n// the whole list is three pointer-sized words:\nassert_eq!(\n    size_of::<LinkedList<i32>>(),\n    3 * size_of::<usize>(),\n);",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Why not `*mut Node<T>` directly? Two reasons. (1) `*mut T` is invariant in `T`, which we don't want for an owning collection — `LinkedList<&'static str>` should be usable where `LinkedList<&'a str>` is expected. (2) `Option<*mut T>` is two words because `*mut T` permits a null bit pattern. `NonNull<T>` plus `Option` plus `PhantomData` is the canonical recipe.",
          "dynamic": "There are simpler-looking choices we don't take. A plain `*mut Node<T>` would work but it makes the type rigid in a way that breaks lifetime subtyping, and it doesn't get the size-saving null-pointer trick. The `Option<NonNull<...>>` plus marker pattern is what `Vec`, `BTreeMap`, and the standard `LinkedList` all use."
        },
        "code": "impl<T> LinkedList<T> {\n    pub const fn new() -> Self {\n        LinkedList {\n            front: None,\n            back: None,\n            len: 0,\n            _marker: PhantomData,\n        }\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Layout: `Option<NonNull<Node<T>>>` for both ends, `len: usize`, and a `PhantomData<Box<Node<T>>>` to claim ownership for variance and dropck. Three pointer-sized words, no runtime cost from the marker.",
      "dynamic": "The list is two end-pointers plus a length. The pointers are `NonNull<T>` (so the compiler can pack `None` into the zero bits) and a `PhantomData<Box<...>>` field gives the compiler the ownership story it needs."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-layout.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Variance and Subtyping",
    "gesture": {
      "systems": "Rust has subtyping, but only over lifetimes. `&'long T` is a subtype of `&'short T` because anywhere the shorter borrow is required, a longer one will do. Variance says how a generic type lifts that relationship. We need to pick: covariant, contravariant, or invariant in `T`. Wrong choice = soundness hole.",
      "dynamic": "Subtyping is the rule that says \"if you asked for X, I can give you a more specific Y instead.\" Rust uses it almost nowhere — except for lifetimes. A reference that lives for ten years can stand in for one that only needs to live for one. Generic types like our `LinkedList<T>` need to declare how they react to that flexibility, and `PhantomData` is how we declare it."
    },
    "steps": [
      {
        "prose": {
          "systems": "Covariance: `Foo<&'long T>` is a subtype of `Foo<&'short T>`. This is what you want for owning containers — a `Vec<&'static str>` should pass for a `Vec<&'a str>`. Contravariance is the opposite, mostly seen in function arguments. Invariance is no relationship — required wherever interior mutability touches `T`.",
          "dynamic": "Covariance: a container of long-lived things can stand in for a container of shorter-lived things. That's the natural rule for things you own and read. Invariance: no substitution at all in either direction. That's the rule for anything you can write through, because writing the wrong-lifetime value in would be unsound."
        },
        "code": "// covariant in T (what we want):\n//   LinkedList<&'static str>  →  LinkedList<&'a str>     OK\n//\n// invariant in T (what *mut T would force):\n//   LinkedList<&'static str>  →  LinkedList<&'a str>     reject\n//\n// contravariant in T (rare, function args):\n//   fn(&'a str)               →  fn(&'static str)        OK"
      },
      {
        "prose": {
          "systems": "`PhantomData<X>` makes the enclosing struct inherit the variance of `X`. The standard cookbook: `PhantomData<T>` for \"contains a T\" (covariant, dropck-aware), `PhantomData<&'a T>` for \"borrows a T\" (covariant, no drop), `PhantomData<&'a mut T>` for \"borrows mutably\" (invariant), `PhantomData<fn(T)>` for \"contravariant in T\". `PhantomData<Box<T>>` is covariant *and* signals owning-and-dropping for dropck.",
          "dynamic": "`PhantomData<X>` is a knob. The variance the compiler computes for the whole struct is the variance of whatever you put inside that `PhantomData`. The standard recipes are short: use `PhantomData<T>` or `PhantomData<Box<T>>` to behave like an owner; use `PhantomData<&'a T>` to behave like a reader; use `PhantomData<fn(T)>` if you're generic over a callback parameter."
        },
        "code": "// our pick:\nstruct LinkedList<T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    len: usize,\n    _marker: PhantomData<Box<Node<T>>>,\n    //                  ^^^^^^^^^^^^^^^\n    //   covariant in T, claims to own and drop Node<T>\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Drop check (\"dropck\") is the second job of the marker. When the list is dropped, the compiler needs to know whether dropping `Node<T>` could touch borrowed data of lifetime `'a`. Without a `PhantomData<Box<...>>`, the compiler sees raw pointers and doesn't realize we own and drop `Node<T>`. With it, dropck handles cyclic-lifetime cases like `LinkedList<&'a Cell<...>>` correctly.",
          "dynamic": "There's a second purpose to that marker: it tells the compiler \"when you drop me, I will drop `Node<T>` values, which might touch borrowed data\". This matters in code that has cycles between borrowed values and a collection. Without the marker, the compiler would assume our raw pointers have no destructor and let unsound programs through."
        },
        "code": "// without the marker, this could compile and be unsound:\n// {\n//     let mut list: LinkedList<&Cell<...>> = LinkedList::new();\n//     let cell = Cell::new(...);\n//     list.push_back(&cell);\n//     // cell dropped first, then list dropped, dropck doesn't see\n//     // that list's drop touches T via Box<Node<T>> -- BAD.\n// }\n//\n// PhantomData<Box<Node<T>>> tells dropck the truth."
      }
    ],
    "tldr": {
      "systems": "Subtyping in Rust is lifetime-only. Variance lifts that into generic types. `PhantomData<Box<Node<T>>>` gives us covariance over `T` and the dropck behavior of an owner — the right answer for an owning collection.",
      "dynamic": "Variance is how Rust's lifetime-substitution rule travels through your generic type. `PhantomData<Box<Node<T>>>` is the spell that says \"behave like an owner of `Node<T>` for variance and for cleanup-ordering\". That's exactly what we want."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-variance.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Basics",
    "gesture": {
      "systems": "Five operations: `new`, `push_front`, `pop_front`, `push_back`, `pop_back`. Each one is a sequence of pointer writes wrapped in `unsafe`. We allocate with `Box::new` and convert into raw with `Box::into_raw`; we free by going back through `Box::from_raw`. Symmetry between front and back lets us write half the code.",
      "dynamic": "Time to write the basic API. Each operation is short — eight to twelve lines — but every line either creates or destroys a heap allocation, or rewires a `next`/`prev` link. We use `Box::new` to allocate, `Box::into_raw` to drop the safe wrapper, and `Box::from_raw` to put the wrapper back so Rust will free the memory."
    },
    "steps": [
      {
        "prose": {
          "systems": "`push_front`: allocate a node, leak the Box into a raw pointer, splice it ahead of the current `front`. The `unsafe` block wraps the dereferences. Three cases would be tempting (empty / single / general) but the symmetry of `Option` collapses them: if `front` was `None` then the back end is also empty and we set both.",
          "dynamic": "`push_front`: build a node with `Box::new`, convert it to a raw pointer (this consumes the Box without freeing the memory — that's `Box::into_raw`), wire the existing `front` to point back at it, and update `self.front`. If the list was empty, both ends now point at the new node."
        },
        "code": "pub fn push_front(&mut self, elem: T) {\n    unsafe {\n        let new = NonNull::new_unchecked(Box::into_raw(Box::new(Node {\n            front: None,\n            back: self.front,\n            elem,\n        })));\n        match self.front {\n            Some(old) => (*old.as_ptr()).front = Some(new),\n            None => self.back = Some(new),\n        }\n        self.front = Some(new);\n        self.len += 1;\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`pop_front`: take the front pointer, reconstruct the `Box<Node<T>>` so its destructor will run, splice the new front in. `Box::from_raw` takes ownership of the heap allocation back from us; dropping the returned `Box` frees the node and runs its drop glue. We extract the element by value before the box drops.",
          "dynamic": "`pop_front`: read the front pointer; if `None`, return `None`. Otherwise reconstruct a `Box` from the raw pointer (this is `Box::from_raw` — the inverse of `into_raw`) so the heap allocation will be freed when the box goes out of scope. Pull the element out of the node, fix up the `front` link of the new head, and decrement the length."
        },
        "code": "pub fn pop_front(&mut self) -> Option<T> {\n    unsafe {\n        self.front.map(|node| {\n            let boxed = Box::from_raw(node.as_ptr());\n            self.front = boxed.back;\n            match self.front {\n                Some(new) => (*new.as_ptr()).front = None,\n                None => self.back = None,\n            }\n            self.len -= 1;\n            boxed.elem\n        })\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`push_back` and `pop_back` are the same code with `front`/`back` swapped throughout. In a real implementation you write them out explicitly — macros that generate them are a worse experience for everyone reading the code than four eight-line functions.",
          "dynamic": "The back-end versions are mirror images of the front-end ones. The same shape, with `front` and `back` swapped at every use. Don't try to be clever and macro this away — the four functions side by side are easy to read; the macro that generates them is not."
        },
        "code": "pub fn push_back(&mut self, elem: T) {\n    unsafe {\n        let new = NonNull::new_unchecked(Box::into_raw(Box::new(Node {\n            back: None,\n            front: self.back,\n            elem,\n        })));\n        match self.back {\n            Some(old) => (*old.as_ptr()).back = Some(new),\n            None => self.front = Some(new),\n        }\n        self.back = Some(new);\n        self.len += 1;\n    }\n}\n\npub fn pop_back(&mut self) -> Option<T> {\n    unsafe {\n        self.back.map(|node| {\n            let boxed = Box::from_raw(node.as_ptr());\n            self.back = boxed.front;\n            match self.back {\n                Some(new) => (*new.as_ptr()).back = None,\n                None => self.front = None,\n            }\n            self.len -= 1;\n            boxed.elem\n        })\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Drop is the iterative form we wrote in Chapter 1, modernized: `while let Some(_) = self.pop_front() {}`. Each `pop_front` reconstructs and drops one box, freeing one node. No recursion, constant stack.",
          "dynamic": "Cleanup uses our own `pop_front` in a loop. Each call drops one node; the loop ends when the list is empty. We could write a tighter version that walks the chain manually, but `pop_front` is already correct and panic-safe — let it do the work."
        },
        "code": "impl<T> Drop for LinkedList<T> {\n    fn drop(&mut self) {\n        while self.pop_front().is_some() {}\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "`Box::into_raw` to leak nodes onto the heap, `Box::from_raw` to take them back. `push_front`/`pop_front` are eight lines of pointer surgery; the back versions are the same with names swapped. `Drop` calls `pop_front` in a loop — iterative, like Chapter 1.",
      "dynamic": "The basic API is short. Allocate with `Box::new`, hand the pointer to the list, and only free when the list pulls the pointer back through `Box::from_raw`. Front and back are mirror images of each other."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-basics.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Panic Safety",
    "gesture": {
      "systems": "Once `T` carries a destructor, every operation has to consider \"what if a panic unwinds through the middle of me?\" The bad outcome is leaving the list in a state where `Drop` will double-free, dangle, or skip a node. The standard tools: keep invariants per-step, or build on the side and swap atomically.",
      "dynamic": "Rust panics unwind the stack, running destructors as they go. If our list is half-rewired when a panic blows through, the eventual `Drop` will hit broken pointers and corrupt memory. We have to make sure that every place a panic *can* originate, the list is already in some valid shape."
    },
    "steps": [
      {
        "prose": {
          "systems": "The dangerous spot in `Clone` is `T::clone()`. We want to clone every element and link the new nodes into a fresh list. The risk: clone the first three elements, panic on the fourth, and an unwinding `Drop` frees three half-linked nodes. The fix: build an entirely new `LinkedList<T>` with `push_back` (which is itself panic-safe — only one mutation per call, in the right order) and only assign it to the destination at the very end.",
          "dynamic": "Cloning a list means cloning every element. If element seven's `clone` panics, we've already allocated six new nodes — what happens to them? If we built them into a half-finished version of `self`, that half-finished thing is what gets dropped, and dropping a malformed list is undefined behavior. The fix: build a brand-new list on the side, only swap it into place when the build is complete."
        },
        "code": "impl<T: Clone> Clone for LinkedList<T> {\n    fn clone(&self) -> Self {\n        let mut new = LinkedList::new();\n        for item in self {\n            // if T::clone panics here, `new` is dropped\n            // cleanly by its own Drop impl. self is untouched.\n            new.push_back(item.clone());\n        }\n        new\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Inside each individual operation, the invariant to maintain is: at every point where a panic could fire, the list's `front`/`back`/`len` and every node's `front`/`back` agree with each other. Allocate first (allocations can panic on OOM in some configurations), then do the rewiring as a sequence of writes that never leaves the structure half-linked.",
          "dynamic": "Inside each method, the rule is \"do the panicky thing first, and then do the bookkeeping.\" Allocation is the only operation in our basic methods that can panic. Allocate the node first; if that panics, the list hasn't been touched. Then do the pointer rewiring, which is a bunch of plain stores that can't panic."
        },
        "code": "// good: allocate first, rewire after.\nlet new = NonNull::new_unchecked(Box::into_raw(Box::new(node)));\n// from here down, no panics possible.\nself.front = Some(new);\nself.len += 1;\n\n// bad pattern: rewire while dropping old data, then alloc.\n// if the alloc panics, len and pointers disagree."
      },
      {
        "prose": {
          "systems": "Drop check meets panic safety: if a `Node`'s `T` panics during drop, the whole list's `Drop` impl must still complete. Our `Drop` calls `pop_front` repeatedly; if one element's destructor panics, `pop_front` has already removed it from the list, so subsequent drops still find a consistent structure. The double-panic case (panicking while unwinding) aborts the process — which is the correct behavior.",
          "dynamic": "If `T`'s own destructor panics — which is rare but legal — our `Drop` must still leave the list in a freeable state. Because we use `pop_front` in our loop, the node is fully detached *before* its element is dropped. Subsequent iterations see a clean list. If a second panic happens during unwinding, the program aborts — that's the standard library's policy too."
        },
        "code": "// Drop loop:\n// iter N:\n//   pop_front detaches node N from list (writes only)\n//   pop_front returns Some(elem)\n//   elem dropped at end of statement\n//     -- if elem's drop panics, N is already gone from list,\n//        list is still well-formed, unwind continues."
      }
    ],
    "tldr": {
      "systems": "Two patterns: (1) build-on-the-side then swap, used in `Clone`; (2) allocate-first-then-rewire, used in every basic op. `Drop` walks via `pop_front` so that a panicking element doesn't leave the list malformed.",
      "dynamic": "Panics can fire during element clones and during element drops. Build-then-swap protects `Clone`; doing the can-panic step before any pointer surgery protects everything else; using `pop_front` in `Drop` keeps the list consistent even if an element's destructor panics."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-panics.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Boring Combinatorics",
    "gesture": {
      "systems": "Now the mechanical accessors. `front`, `front_mut`, `back`, `back_mut`. Then three iterators: by-value (`IntoIter`), by-shared-ref (`Iter`), by-mutable-ref (`IterMut`). The pattern is identical to Chapter 2; the only difference is dereferencing `NonNull<Node<T>>` instead of pattern-matching on a safe enum.",
      "dynamic": "A handful of small accessors and the standard three iterators. None of this is conceptually new — every linked list in the book has had this section. The only twist is that we have to write `unsafe` to dereference our pointers, but the structure mirrors the safe versions exactly."
    },
    "steps": [
      {
        "prose": {
          "systems": "`front`/`back` return `Option<&T>`. We turn `Option<NonNull<Node<T>>>` into `Option<&T>` via `map(|node| unsafe { &(*node.as_ptr()).elem })`. The `_mut` versions use `&mut` instead. The lifetime of the returned reference is tied to `&self` (or `&mut self`) by elision — the compiler will not let it escape past the next mutation.",
          "dynamic": "`front` returns a shared reference to the first element, or `None`. We write `unsafe { &(*ptr).elem }` to dereference the raw pointer. The lifetime of the returned `&T` is tied to the borrow of `self`, so the compiler will refuse to let the reference outlive a subsequent `pop_front`."
        },
        "code": "impl<T> LinkedList<T> {\n    pub fn front(&self) -> Option<&T> {\n        unsafe { self.front.map(|n| &(*n.as_ptr()).elem) }\n    }\n\n    pub fn front_mut(&mut self) -> Option<&mut T> {\n        unsafe { self.front.map(|n| &mut (*n.as_ptr()).elem) }\n    }\n\n    pub fn back(&self) -> Option<&T> {\n        unsafe { self.back.map(|n| &(*n.as_ptr()).elem) }\n    }\n\n    pub fn back_mut(&mut self) -> Option<&mut T> {\n        unsafe { self.back.map(|n| &mut (*n.as_ptr()).elem) }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Iter<'a, T>` walks shared references. Hold a current pointer and a remaining-count; each call to `next` reads `elem`, advances along `back`, decrements the count. The shared-borrow lifetime `'a` ties the iterator's references to the original list. `PhantomData<&'a Node<T>>` carries it.",
          "dynamic": "`Iter` is a shared-reference iterator. It holds a pointer to the next node to visit and a count of how many remain. Each call to `next` returns `Some(&elem)` or `None`. We need a `PhantomData<&'a Node<T>>` to tie the iterator's borrow lifetime back to the list — without it the compiler doesn't know the iterator borrows from the list."
        },
        "code": "pub struct Iter<'a, T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    len: usize,\n    _marker: PhantomData<&'a Node<T>>,\n}\n\nimpl<'a, T> Iterator for Iter<'a, T> {\n    type Item = &'a T;\n    fn next(&mut self) -> Option<&'a T> {\n        if self.len == 0 { return None; }\n        unsafe {\n            self.front.map(|n| {\n                self.len -= 1;\n                self.front = (*n.as_ptr()).back;\n                &(*n.as_ptr()).elem\n            })\n        }\n    }\n}\n\nimpl<T> LinkedList<T> {\n    pub fn iter(&self) -> Iter<'_, T> {\n        Iter { front: self.front, back: self.back, len: self.len, _marker: PhantomData }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`IterMut` is the same shape with `&'a mut T` and `PhantomData<&'a mut Node<T>>`. The reason this is sound — and not aliasing-violating — is that the iterator holds an exclusive borrow of the whole list, never hands out two references to the same node, and walks linearly. Miri verifies this; we'll run it in the testing section.",
          "dynamic": "`IterMut` produces mutable references. The reason this works without lying to the borrow checker is that at any moment the iterator only holds one live `&mut T`, and its existence rules out anyone else accessing the list (because `IterMut` was built from `&mut self`). Since we walk linearly and never revisit a node, there's no aliasing violation."
        },
        "code": "pub struct IterMut<'a, T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    len: usize,\n    _marker: PhantomData<&'a mut Node<T>>,\n}\n\nimpl<'a, T> Iterator for IterMut<'a, T> {\n    type Item = &'a mut T;\n    fn next(&mut self) -> Option<&'a mut T> {\n        if self.len == 0 { return None; }\n        unsafe {\n            self.front.map(|n| {\n                self.len -= 1;\n                self.front = (*n.as_ptr()).back;\n                &mut (*n.as_ptr()).elem\n            })\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`IntoIter` *is* a `LinkedList<T>` with a shim. It holds the original list by value and delegates `next` to `pop_front`, `next_back` to `pop_back`. That gets us `DoubleEndedIterator` for free and ensures the destructor runs on whatever's left if iteration stops early.",
          "dynamic": "`IntoIter` consumes the list. Easiest implementation: wrap the list and have `next` call `pop_front`. Bonus: `next_back` can call `pop_back`, giving us a `DoubleEndedIterator` (you can iterate from either end) for free. If you stop iterating partway, the wrapped list's `Drop` cleans up the rest."
        },
        "code": "pub struct IntoIter<T> { list: LinkedList<T> }\n\nimpl<T> Iterator for IntoIter<T> {\n    type Item = T;\n    fn next(&mut self) -> Option<T> { self.list.pop_front() }\n    fn size_hint(&self) -> (usize, Option<usize>) { (self.list.len, Some(self.list.len)) }\n}\n\nimpl<T> DoubleEndedIterator for IntoIter<T> {\n    fn next_back(&mut self) -> Option<T> { self.list.pop_back() }\n}\n\nimpl<T> IntoIterator for LinkedList<T> {\n    type Item = T;\n    type IntoIter = IntoIter<T>;\n    fn into_iter(self) -> IntoIter<T> { IntoIter { list: self } }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Accessors are one-line `unsafe` deref-and-borrow. `Iter`/`IterMut` carry a `PhantomData<&'a [mut] Node<T>>` to bind their lifetime to the list. `IntoIter` wraps the list and forwards to `pop_front`/`pop_back`, getting `DoubleEndedIterator` for free.",
      "dynamic": "Front/back getters, three iterators. `Iter` and `IterMut` walk pointers and use `PhantomData` to tie their lifetimes back to the list. `IntoIter` is a wrapper around the list that uses `pop_front`/`pop_back`."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-combinatorics.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Filling In Random Bits",
    "gesture": {
      "systems": "A real collection in the std-collections style implements a long tail of traits: `Default`, `Clone`, `Extend`, `FromIterator`, `Debug`, `PartialEq`/`Eq`, `PartialOrd`/`Ord`, `Hash`, plus the simple `is_empty`, `len`, `clear` methods. Most of them are one-liners on top of `iter()`.",
      "dynamic": "Now we earn the \"production-quality\" label. None of these traits is hard, but a real collection in the standard library has all of them. We can write most of them in two or three lines apiece by delegating to the iterator we already wrote."
    },
    "steps": [
      {
        "prose": {
          "systems": "Trivial methods first. `len` and `is_empty` are direct reads. `clear` is `*self = Self::new()` after `Drop`-equivalent work — easiest is to drop in place via `mem::take`-of-self isn't possible without `Default`, so just loop `pop_front`.",
          "dynamic": "The simplest ones. `len` returns the count, `is_empty` checks if the count is zero, `clear` empties the list by popping until nothing's left."
        },
        "code": "impl<T> LinkedList<T> {\n    pub fn len(&self) -> usize { self.len }\n    pub fn is_empty(&self) -> bool { self.len == 0 }\n    pub fn clear(&mut self) {\n        while self.pop_front().is_some() {}\n    }\n}\n\nimpl<T> Default for LinkedList<T> {\n    fn default() -> Self { LinkedList::new() }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`Extend` and `FromIterator`: take an iterator, push each element onto the back. `FromIterator` builds a new list and forwards to `Extend`. Both are short because `push_back` does the real work.",
          "dynamic": "`Extend` is \"add everything from this iterator to the end of me\". `FromIterator` is \"build a new me from this iterator\". They're both loops calling `push_back`."
        },
        "code": "impl<T> Extend<T> for LinkedList<T> {\n    fn extend<I: IntoIterator<Item = T>>(&mut self, iter: I) {\n        for item in iter { self.push_back(item); }\n    }\n}\n\nimpl<T> FromIterator<T> for LinkedList<T> {\n    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self {\n        let mut list = LinkedList::new();\n        list.extend(iter);\n        list\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Comparison and hashing all delegate to iterating both lists in lockstep. `PartialEq` walks element-wise; `PartialOrd`/`Ord` use lexicographic order; `Hash` mixes in the length followed by every element. `Debug` uses the formatter's `debug_list` helper.",
          "dynamic": "Equality compares elements one-by-one. Ordering is lexicographic — like comparing strings character-by-character. Hashing folds in the length and then every element. `Debug` prints in `[a, b, c]` form using the formatter's helper."
        },
        "code": "use std::fmt;\nuse std::hash::{Hash, Hasher};\n\nimpl<T: fmt::Debug> fmt::Debug for LinkedList<T> {\n    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {\n        f.debug_list().entries(self).finish()\n    }\n}\n\nimpl<T: PartialEq> PartialEq for LinkedList<T> {\n    fn eq(&self, other: &Self) -> bool {\n        self.len == other.len && self.iter().eq(other.iter())\n    }\n}\nimpl<T: Eq> Eq for LinkedList<T> {}\n\nimpl<T: PartialOrd> PartialOrd for LinkedList<T> {\n    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {\n        self.iter().partial_cmp(other.iter())\n    }\n}\nimpl<T: Ord> Ord for LinkedList<T> {\n    fn cmp(&self, other: &Self) -> std::cmp::Ordering {\n        self.iter().cmp(other.iter())\n    }\n}\n\nimpl<T: Hash> Hash for LinkedList<T> {\n    fn hash<H: Hasher>(&self, state: &mut H) {\n        self.len.hash(state);\n        for item in self { item.hash(state); }\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "All the standard traits delegate to iteration. `Extend`/`FromIterator` are loops over `push_back`. Comparison and hashing walk in lockstep. `Debug` uses `debug_list`. None of it is novel; all of it is required.",
      "dynamic": "Most of the trait suite is two-line glue on top of the iterator we already have. Implementing them once gets us `==`, `<`, `format!(\"{:?}\")`, `HashSet<LinkedList<T>>`, and the rest of what users expect."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-random-bits.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Testing",
    "gesture": {
      "systems": "Tests live next to the code in `#[cfg(test)] mod tests`. We exercise basic ops, iteration in both directions, clone, equality, and a stress loop. Then we run the same tests under Miri, which interprets the program and flags every undefined-behavior trigger we managed to write past the type system.",
      "dynamic": "Two layers of testing. Regular unit tests check that the list does what we want. Then we run those same tests under Miri — an interpreter that catches undefined behavior the compiler can't see, like aliasing violations and use-after-free. Unsafe code without Miri is unsafe code on faith."
    },
    "steps": [
      {
        "prose": {
          "systems": "A handful of unit tests: round-trip push/pop on each end, drain via iteration, mutate through `IterMut`, clone-equals-original. Together these touch every method at least once and walk both directions.",
          "dynamic": "Tests cover the common paths: push and pop on both ends, iterate, mutate through the iterator, clone the list and compare to the original."
        },
        "code": "#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn push_pop_front() {\n        let mut l = LinkedList::new();\n        l.push_front(1);\n        l.push_front(2);\n        assert_eq!(l.pop_front(), Some(2));\n        assert_eq!(l.pop_front(), Some(1));\n        assert_eq!(l.pop_front(), None);\n    }\n\n    #[test]\n    fn iter_mut_doubles() {\n        let mut l: LinkedList<i32> = (1..=4).collect();\n        for x in l.iter_mut() { *x *= 2; }\n        assert!(l.iter().copied().eq([2, 4, 6, 8]));\n    }\n\n    #[test]\n    fn clone_eq() {\n        let a: LinkedList<String> = (0..50).map(|i| i.to_string()).collect();\n        let b = a.clone();\n        assert_eq!(a, b);\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Run the unit tests under Miri: `cargo +nightly miri test`. Miri interprets every operation and validates against the stacked-borrows / tree-borrows model. Any aliasing or provenance violation we wrote earns a stack trace.",
          "dynamic": "To run Miri you need the nightly compiler with the `miri` component. The same `cargo test` command, with `miri` injected, interprets each test and screams about undefined behavior. If our pointer use respects Rust's aliasing rules, Miri stays quiet."
        },
        "code": "$ rustup toolchain install nightly\n$ rustup +nightly component add miri\n$ cargo +nightly miri test\n   Compiling sixth v0.1.0\n     Running unittests src/lib.rs\nrunning 3 tests\ntest sixth::tests::push_pop_front ... ok\ntest sixth::tests::iter_mut_doubles ... ok\ntest sixth::tests::clone_eq ... ok\n\ntest result: ok. 3 passed; 0 failed"
      }
    ],
    "tldr": {
      "systems": "Unit tests for round-trips and iteration, then the same suite under `cargo miri test`. Miri is the only ground truth for unsafe code's pointer behavior — there is no replacement.",
      "dynamic": "Write normal `#[test]` functions, run them with `cargo test` to check correctness, then again with `cargo miri test` to check for invisible UB. Both are required for unsafe code."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-testing.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Send, Sync, and Compile Tests",
    "gesture": {
      "systems": "`Send` and `Sync` are auto-traits — the compiler implements them for any type whose fields all implement them. Raw pointers do not implement either, on the assumption that an `unsafe` author hasn't proved thread-safety. We have to opt our list back in by writing the impls ourselves, with `unsafe impl`. Then we add compile-fail tests to verify we got the bounds right.",
      "dynamic": "`Send` means \"safe to move to another thread\". `Sync` means \"safe to share between threads via `&T`\". Most types get both for free. Types containing raw pointers don't, because the compiler can't tell if they're thread-safe. Our list *is* thread-safe — equivalent to a `Vec<T>` for these purposes — so we manually opt in."
    },
    "steps": [
      {
        "prose": {
          "systems": "The opt-in impls. A `LinkedList<T>` is `Send` exactly when `T: Send` (moving the list to another thread moves all the elements). It's `Sync` when `T: Sync` (sharing `&LinkedList<T>` only exposes `&T`). Same impls again for `Iter`/`IterMut`/`IntoIter`.",
          "dynamic": "Two `unsafe impl` lines. Read each as: \"if `T` is safe-to-send, then so is the list\" and \"if `T` is safe-to-share, then so is the list\". The `unsafe` keyword is us telling the compiler we've reasoned about the safety, since the compiler can't."
        },
        "code": "unsafe impl<T: Send> Send for LinkedList<T> {}\nunsafe impl<T: Sync> Sync for LinkedList<T> {}\n\nunsafe impl<T: Send> Send for Iter<'_, T> {}\nunsafe impl<T: Sync> Sync for Iter<'_, T> {}\nunsafe impl<T: Send> Send for IterMut<'_, T> {}\nunsafe impl<T: Sync> Sync for IterMut<'_, T> {}\nunsafe impl<T: Send> Send for IntoIter<T> {}\nunsafe impl<T: Sync> Sync for IntoIter<T> {}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Verify the bounds with a static-assertion trick: a function with a where-clause that only compiles if the impl exists. Place these in tests; they're compile-time checks, no runtime cost. Symmetrically, set up a `trybuild` test that pins the *negative* cases (e.g., `LinkedList<Rc<i32>>` is not `Send`).",
          "dynamic": "We can verify our bounds with a trick: write a function whose only purpose is to require the trait. If our bounds are wrong, the test fails to compile. For the negative side — checking that we *don't* accidentally implement `Send` for things we shouldn't — use the `trybuild` crate, which runs compile-fail tests."
        },
        "code": "#[cfg(test)]\nfn _assert_send_sync() {\n    fn assert_send<T: Send>() {}\n    fn assert_sync<T: Sync>() {}\n    assert_send::<LinkedList<i32>>();\n    assert_sync::<LinkedList<i32>>();\n    assert_send::<Iter<'_, i32>>();\n    assert_send::<IterMut<'_, i32>>();\n    assert_send::<IntoIter<i32>>();\n}\n\n// trybuild test (in tests/compile-fail/not-send.rs):\n// fn must_be_send<T: Send>() {}\n// fn main() {\n//     must_be_send::<LinkedList<std::rc::Rc<i32>>>();\n//     // expected: error[E0277]: ... cannot be sent between threads safely\n// }",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Variance has the same compile-test pattern. A function that takes `LinkedList<&'static T>` and returns it as `LinkedList<&'a T>` only compiles if the type is covariant. Add it to the test suite as a regression guard — change the marker to `PhantomData<*mut Node<T>>` and this assertion stops compiling.",
          "dynamic": "We can also verify variance with a compile test. A function that converts a `LinkedList<&'static T>` to a `LinkedList<&'a T>` only typechecks if the list is covariant in its parameter. If somebody later changes the marker incorrectly, this test will fail to compile and tell us."
        },
        "code": "#[cfg(test)]\nfn _assert_covariant<'a, T>(\n    long: LinkedList<&'static T>,\n) -> LinkedList<&'a T> {\n    long  // only compiles if LinkedList is covariant in T\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Raw pointers veto auto-`Send`/`Sync`; opt back in with `unsafe impl`. Add `assert_send::<...>()` compile tests for the positive cases and `trybuild` compile-fail tests for the negatives. A covariance assertion guards the `PhantomData` choice.",
      "dynamic": "Opt the list back into thread-safety with two `unsafe impl` lines per type, then write compile-time assertions that prove you got it right. Compile tests are free at runtime and catch regressions immediately."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-send-sync.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "An Introduction To Cursors",
    "gesture": {
      "systems": "A cursor is a position inside a sequence — like the blinking insertion point in a text editor — that you can advance, retreat, and edit at. It is what `Iterator` is not: bidirectional, stable across mutations, and able to splice. The standard library exposes `LinkedList::cursor_front_mut()` (unstable) for exactly this.",
      "dynamic": "An iterator can only walk forward (or, if it's a `DoubleEndedIterator`, also from the other end inward). It can't sit still while you splice things around it. A cursor can. Think of the blinking caret in a text editor: it has a position; you can move it; you can type at it; you can select a range starting from it. That's the API we're building."
    },
    "steps": [
      {
        "prose": {
          "systems": "Why iterators don't fit. A `&mut` iterator hands out `&mut T` references whose lifetimes outlive each call to `next`. To insert or remove a node mid-iteration, the iterator would have to invalidate or reissue references, which the borrow checker doesn't allow. Cursors solve this by exposing `&mut LinkedList<T>` semantics at a single position rather than streaming references.",
          "dynamic": "Why `IterMut` can't do this: it hands out a fresh `&mut T` each step, and those references can't coexist with simultaneously editing the list around them. A cursor instead holds the mutable borrow of the *list*, plus a current-position pointer — and exposes editing methods that operate at that position."
        },
        "code": "// iterator: stream of references, can't edit around them\nfor x in list.iter_mut() {\n    *x += 1;\n    // can't list.push_back(...) here — list is borrowed by iter\n}\n\n// cursor: one position, full mutation rights\nlet mut c = list.cursor_front_mut();\nwhile let Some(x) = c.current() {\n    if *x == 0 { c.remove_current(); } else { c.move_next(); }\n}"
      },
      {
        "prose": {
          "systems": "The std model: `CursorMut<'a, T>` borrows `&'a mut LinkedList<T>` and tracks a position that can be either at a node or at a special \"ghost\" position between back and front (representing the gap that wraps around in a circular view). Movement past either end lands on the ghost; one more step lands back on the other end.",
          "dynamic": "The standard library's design imagines the list as a ring with one extra slot — a \"ghost\" position past the back that wraps around to the front. `move_next` from the last real node lands on the ghost; another `move_next` from the ghost lands on the first real node. This eliminates a whole class of edge-case checks in cursor methods."
        },
        "code": "// list:    A <-> B <-> C\n// states:  [G] A [.] B [.] C [G]   (G = ghost)\n//\n// move_next from C lands on ghost.\n// move_next from ghost lands on A.\n// current() returns None at the ghost.\n//\n// insert_after at ghost == push_front (effectively).\n// insert_before at ghost == push_back (effectively)."
      }
    ],
    "tldr": {
      "systems": "Cursors are stable mutable positions inside a sequence — what iterators can't be because of aliasing rules. Std's model uses a ghost position to unify the wraparound case; movement and insertion are bidirectional from any point.",
      "dynamic": "A cursor is a movable insertion point. It can do everything an iterator can do plus splice, insert, and remove without invalidating itself. The standard library models it with a ghost slot between the back and the front to keep the math clean."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-cursors-intro.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Implementing Cursors",
    "gesture": {
      "systems": "`CursorMut<'a, T>` holds `&'a mut LinkedList<T>` and `cur: Option<NonNull<Node<T>>>` for the current position (`None` is the ghost). We also track an `index: Option<usize>` so callers can ask where they are without walking. Methods: movement, peeking, insertion, removal, and the splice/split family.",
      "dynamic": "The cursor type holds a mutable borrow of the list plus a current-position pointer. `None` for the position means the cursor sits on the ghost. We also keep an `index` so callers can know how far in they are. The methods come in five families: move, peek, insert, remove, splice."
    },
    "steps": [
      {
        "prose": {
          "systems": "Definition and constructors. `cursor_mut` starts at the ghost; `cursor_front_mut` starts at the front (or the ghost if empty). The `'a` lifetime ties the cursor to the borrow of the list.",
          "dynamic": "Define the type and the constructors. Starting at the ghost (`None`) is the default; there are also helpers to start at the front or back."
        },
        "code": "pub struct CursorMut<'a, T> {\n    list: &'a mut LinkedList<T>,\n    cur: Option<NonNull<Node<T>>>,\n    index: Option<usize>,\n}\n\nimpl<T> LinkedList<T> {\n    pub fn cursor_mut(&mut self) -> CursorMut<'_, T> {\n        CursorMut { list: self, cur: None, index: None }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`move_next` and `move_prev`. From a real node, advance to the node's `back` (or `front`); if that's `None`, land on the ghost. From the ghost, wrap to `list.front` (or `list.back`). Index updates accordingly.",
          "dynamic": "Movement. From a real node, take the `back` link; if there's nothing there, you're now on the ghost. From the ghost, wrap to the front of the list. The `index` tracks position; `None` at the ghost, `Some(n)` at a real node."
        },
        "code": "impl<'a, T> CursorMut<'a, T> {\n    pub fn move_next(&mut self) {\n        match self.cur {\n            Some(n) => unsafe {\n                self.cur = (*n.as_ptr()).back;\n                self.index = if self.cur.is_some() {\n                    Some(self.index.unwrap() + 1)\n                } else { None };\n            },\n            None => {\n                self.cur = self.list.front;\n                self.index = if self.cur.is_some() { Some(0) } else { None };\n            }\n        }\n    }\n\n    pub fn current(&mut self) -> Option<&mut T> {\n        unsafe { self.cur.map(|n| &mut (*n.as_ptr()).elem) }\n    }\n\n    pub fn peek_next(&mut self) -> Option<&mut T> {\n        let next = match self.cur {\n            Some(n) => unsafe { (*n.as_ptr()).back },\n            None => self.list.front,\n        };\n        unsafe { next.map(|n| &mut (*n.as_ptr()).elem) }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`split_before` cuts the list at the cursor: the prefix [front .. cur) is detached and returned as a fresh `LinkedList<T>`, and the cursor's list becomes [cur .. back]. The cursor stays on the same node; the returned list takes the front pointer and a recomputed length. The mirror `split_after` works the other direction.",
          "dynamic": "`split_before` snips the list at the cursor's position. Everything before the cursor leaves with the returned list; the cursor's list keeps everything from the current node onward. The cursor itself doesn't move — it still points at the same node, which is now the new front of the truncated list."
        },
        "code": "impl<'a, T> CursorMut<'a, T> {\n    pub fn split_before(&mut self) -> LinkedList<T> {\n        if let Some(cur) = self.cur {\n            let old_idx = self.index.unwrap();\n            unsafe {\n                let prev = (*cur.as_ptr()).front.take();\n                let new_front = self.list.front;\n                let new_back = prev;\n                if let Some(p) = prev { (*p.as_ptr()).back = None; }\n                self.list.front = Some(cur);\n                let prefix_len = old_idx;\n                self.list.len -= prefix_len;\n                self.index = Some(0);\n                LinkedList {\n                    front: new_front,\n                    back: new_back,\n                    len: prefix_len,\n                    _marker: PhantomData,\n                }\n            }\n        } else {\n            // ghost: take the whole list\n            std::mem::replace(self.list, LinkedList::new())\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "`splice_before` inserts an entire `LinkedList<T>` immediately before the cursor's position. We rewire four pointers (the input list's front and back, plus the surrounding nodes), update `len`, and zero out the input list's pointers so its `Drop` is a no-op. The mirror `splice_after` is the same pattern.",
          "dynamic": "`splice_before` glues another whole list in just before our current node. Four pointer updates rewire the chain; the input list is hollowed out so its destructor finds nothing to free."
        },
        "code": "impl<'a, T> CursorMut<'a, T> {\n    pub fn splice_before(&mut self, mut other: LinkedList<T>) {\n        if other.len == 0 { return; }\n        let other_front = other.front.take().unwrap();\n        let other_back = other.back.take().unwrap();\n        let n = other.len;\n        other.len = 0;\n        unsafe {\n            match self.cur {\n                Some(cur) => match (*cur.as_ptr()).front {\n                    Some(prev) => {\n                        (*prev.as_ptr()).back = Some(other_front);\n                        (*other_front.as_ptr()).front = Some(prev);\n                        (*other_back.as_ptr()).back = Some(cur);\n                        (*cur.as_ptr()).front = Some(other_back);\n                    }\n                    None => {\n                        (*other_back.as_ptr()).back = Some(cur);\n                        (*cur.as_ptr()).front = Some(other_back);\n                        self.list.front = Some(other_front);\n                    }\n                },\n                None => {\n                    // ghost: append to back\n                    if let Some(b) = self.list.back {\n                        (*b.as_ptr()).back = Some(other_front);\n                        (*other_front.as_ptr()).front = Some(b);\n                    } else {\n                        self.list.front = Some(other_front);\n                    }\n                    self.list.back = Some(other_back);\n                }\n            }\n        }\n        self.list.len += n;\n        if let Some(i) = self.index { self.index = Some(i + n); }\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Cursor = `&mut list` plus a node pointer plus an index. Movement wraps through a `None` ghost. Insertion and splicing are sequences of four-to-eight pointer writes; the cursor's index updates accordingly. `split_before` returns a fresh list; the original cursor stays valid.",
      "dynamic": "A cursor is the list borrow plus a position. Move methods wrap through the ghost. Splice methods rewire a handful of pointers and adjust the count. Split methods cut the list and hand you back the other half."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-cursors-impl.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Testing Cursors",
    "gesture": {
      "systems": "Cursor tests stress two things: that movement composes correctly across the ghost boundary, and that insert/remove/splice leave the structure consistent. Run them under Miri — cursors are where pointer logic gets hairiest, and a wrong rewire that doesn't crash the test will still trip aliasing checks.",
      "dynamic": "Cursors are where pointer math gets the most tangled. Tests should walk a list end-to-end, insert and remove things, splice in another list, and check the result. Then run the same tests under Miri to catch any aliasing or ownership mistake the assertions missed."
    },
    "steps": [
      {
        "prose": {
          "systems": "Round-trip test: walk the list to the back, walk back to the front, and compare to the original. Splice test: build two lists, splice one into the other at a known position, verify the resulting sequence.",
          "dynamic": "Two tests. The first walks forward and back to make sure the cursor returns to its starting position. The second splices one list into the middle of another and checks the joined result."
        },
        "code": "#[cfg(test)]\nmod cursor_tests {\n    use super::*;\n\n    #[test]\n    fn walk_and_return() {\n        let mut l: LinkedList<i32> = (0..5).collect();\n        let mut c = l.cursor_mut();\n        c.move_next();\n        for _ in 0..5 { c.move_next(); }\n        assert!(c.current().is_none()); // ghost\n        c.move_next();\n        assert_eq!(c.current(), Some(&mut 0));\n    }\n\n    #[test]\n    fn splice_into_middle() {\n        let mut a: LinkedList<i32> = vec![1, 2, 5, 6].into_iter().collect();\n        let b: LinkedList<i32> = vec![3, 4].into_iter().collect();\n        let mut c = a.cursor_mut();\n        c.move_next(); c.move_next(); c.move_next(); // at 2\n        c.move_next(); // at 5\n        c.splice_before(b);\n        let v: Vec<i32> = a.into_iter().collect();\n        assert_eq!(v, vec![1, 2, 3, 4, 5, 6]);\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Run the cursor tests under Miri the same way as the basic tests. Anything that touches multiple raw pointers in close succession is the most likely place to find aliasing violations.",
          "dynamic": "Run with Miri. Cursors are the place where pointer rewiring is most dense, so it's the place most likely to surface real undefined behavior."
        },
        "code": "$ cargo +nightly miri test cursor\nrunning 2 tests\ntest sixth::cursor_tests::walk_and_return ... ok\ntest sixth::cursor_tests::splice_into_middle ... ok\n\ntest result: ok. 2 passed; 0 failed"
      }
    ],
    "tldr": {
      "systems": "Round-trip and splice tests on the cursor, then `cargo miri test`. Miri catches the aliasing bugs that pass `assert_eq!` because they corrupt memory the tests don't read.",
      "dynamic": "Test movement composition and splice. Run under Miri because cursors are where pointer mistakes hide."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-cursors-testing.html"
  },
  {
    "chapterId": "sixth",
    "chapterNum": 6,
    "chapterTitle": "A Production Unsafe Deque",
    "title": "Final Code",
    "gesture": {
      "systems": "The complete module: `LinkedList<T>`, the trait suite, three iterators, `CursorMut`, the lot. It's the same shape as `std::collections::LinkedList` and passes Miri. It's also a linked list, which means it's almost always the wrong choice in production.",
      "dynamic": "Everything in one place. This is what the standard library's `LinkedList` looks like, modulo allocator hooks and a few unstable methods. It works, it's sound under Miri, it has the full trait suite — and you should still almost never use it."
    },
    "steps": [
      {
        "prose": {
          "systems": "The complete module — keep it open while reading the postscript below.",
          "dynamic": "The whole thing in one file, plus a short postscript on what's still wrong with linked lists in general."
        },
        "code": "use std::cmp::Ordering;\nuse std::fmt;\nuse std::hash::{Hash, Hasher};\nuse std::marker::PhantomData;\nuse std::ptr::NonNull;\n\npub struct LinkedList<T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    len: usize,\n    _marker: PhantomData<Box<Node<T>>>,\n}\n\nstruct Node<T> {\n    front: Option<NonNull<Node<T>>>,\n    back: Option<NonNull<Node<T>>>,\n    elem: T,\n}\n\nimpl<T> LinkedList<T> {\n    pub const fn new() -> Self {\n        LinkedList { front: None, back: None, len: 0, _marker: PhantomData }\n    }\n    pub fn len(&self) -> usize { self.len }\n    pub fn is_empty(&self) -> bool { self.len == 0 }\n    pub fn clear(&mut self) { while self.pop_front().is_some() {} }\n\n    pub fn push_front(&mut self, elem: T) { /* ... */ }\n    pub fn pop_front(&mut self) -> Option<T> { /* ... */ }\n    pub fn push_back(&mut self, elem: T) { /* ... */ }\n    pub fn pop_back(&mut self) -> Option<T> { /* ... */ }\n\n    pub fn front(&self) -> Option<&T> { /* ... */ unimplemented!() }\n    pub fn front_mut(&mut self) -> Option<&mut T> { unimplemented!() }\n    pub fn back(&self) -> Option<&T> { unimplemented!() }\n    pub fn back_mut(&mut self) -> Option<&mut T> { unimplemented!() }\n\n    pub fn iter(&self) -> Iter<'_, T> { unimplemented!() }\n    pub fn iter_mut(&mut self) -> IterMut<'_, T> { unimplemented!() }\n    pub fn cursor_mut(&mut self) -> CursorMut<'_, T> { unimplemented!() }\n}\n\nimpl<T> Default for LinkedList<T> {\n    fn default() -> Self { LinkedList::new() }\n}\nimpl<T> Drop for LinkedList<T> {\n    fn drop(&mut self) { while self.pop_front().is_some() {} }\n}\n\nunsafe impl<T: Send> Send for LinkedList<T> {}\nunsafe impl<T: Sync> Sync for LinkedList<T> {}\n\n// ... Iter, IterMut, IntoIter, CursorMut, Clone, Extend, FromIterator,\n// Debug, PartialEq, Eq, PartialOrd, Ord, Hash, plus their Send/Sync impls,\n// fill out the rest of the module exactly as shown across the chapter.",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "What's still wrong: linked lists thrash the cache (every node is its own allocation), pressure the allocator (one `malloc` per push), waste memory (two pointers of overhead per element), and don't vectorize (no contiguous storage). For nearly every workload, `Vec<T>` or `VecDeque<T>` outperforms a linked list by an order of magnitude. The places linked lists genuinely win — O(1) splice of arbitrary sublists, intrusive lists with hand-managed nodes — are rare in application code.",
          "dynamic": "What's still wrong with this collection: every node lives somewhere different in memory, which destroys cache performance; every push allocates, which is slow compared to growing a buffer in place; each node carries two pointers of overhead per element. Almost any time you reach for a linked list, a `Vec` or a `VecDeque` will be faster. The legitimate uses — O(1) splicing of large sublists, certain intrusive data structures — are uncommon in normal application code. We built this list to learn unsafe Rust, not because anyone needs another one."
        },
        "code": "// the part where we admit defeat:\n// for x in 0..1_000_000 { list.push_back(x); }    // a million mallocs\n// for x in 0..1_000_000 { vec.push(x); }          // ~20 mallocs total"
      }
    ],
    "tldr": {
      "systems": "We built a sound, generic, full-featured `LinkedList<T>` on `NonNull` raw pointers, with proper variance, dropck, panic safety, the std trait surface, and cursors. It's a faithful reimplementation of `std::collections::LinkedList` — and it's still slower than `Vec` for almost every realistic workload.",
      "dynamic": "A complete production-quality deque on raw pointers. It is correct, it has the full standard-library trait suite, and it almost certainly is not what you want in real code — `Vec` or `VecDeque` will beat it. The point was to learn how the unsafe pieces fit together, not to ship another linked list."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/sixth-final.html"
  },
  {
    "chapterId": "infinity",
    "chapterNum": 7,
    "chapterTitle": "A Bunch of Silly Lists",
    "chapterIntro": "We made all the obvious lists. The point of this short closing chapter is to break the assumption that a linked list is a chain of heap nodes. A linked list is any chain of cells where each cell points at the next; where the cells live is up to you.",
    "title": "The Double Single",
    "gesture": {
      "systems": "A doubly-linked list with a current position is just two singly-linked stacks glued at the cursor: everything left of the cursor on one stack, everything right of it on the other. Moving the cursor is `pop` from one stack and `push` onto the other. Insert and remove are local stack operations on whichever side you want.",
      "dynamic": "We struggled with doubly-linked lists in earlier chapters because nodes pointed both ways and nobody clearly owned anyone. Here is a sneaky alternative: keep two singly-linked stacks and call the place where they meet \"the cursor.\" Everything left of the cursor lives on one stack, everything right lives on the other. No back-pointers, no shared ownership, no tears."
    },
    "steps": [
      {
        "prose": {
          "systems": "Two `List<T>` from chapter 2, side by side. `left` is in reverse order (top of the stack is the element nearest the cursor). `right` is in forward order. The cursor sits between them.",
          "dynamic": "The type is just two of the singly-linked lists we already wrote. The trick is what the orderings mean. `left` holds the elements before the cursor, but stacked so the most recent one is on top — the element directly to the left of the cursor is the head of `left`. `right` holds the elements after the cursor in normal order — the element directly to the right of the cursor is the head of `right`."
        },
        "code": "pub struct Zipper<T> {\n    left: List<T>,   // elements before the cursor, reversed\n    right: List<T>,  // elements after the cursor, in order\n}\n\nimpl<T> Zipper<T> {\n    pub fn new() -> Self {\n        Zipper { left: List::new(), right: List::new() }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Move-left is `left.pop()` then `right.push(x)`. Move-right is the mirror. Each is two `O(1)` stack ops; no node has a `prev` pointer because the stack itself encodes \"what came before.\"",
          "dynamic": "To move the cursor one step left, pop the top of the left stack and push it onto the right stack. To move right, do the opposite. Stepping is two cheap stack operations. We never needed a back-pointer; the structure of the two stacks is the back-pointer."
        },
        "code": "impl<T> Zipper<T> {\n    pub fn move_left(&mut self) -> bool {\n        match self.left.pop() {\n            Some(x) => { self.right.push(x); true }\n            None => false,\n        }\n    }\n\n    pub fn move_right(&mut self) -> bool {\n        match self.right.pop() {\n            Some(x) => { self.left.push(x); true }\n            None => false,\n        }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "Insert-at-cursor is `right.push(x)` (or `left.push(x)` depending on which side you want the new element to land). Remove-at-cursor is `right.pop()`. All four edits are stack ops on a singly-linked list — exactly the operations we already know are easy in Rust.",
          "dynamic": "Inserting at the cursor is just pushing onto whichever side. Removing the element directly to the right of the cursor is popping the right stack. Every edit reduces to push/pop on a singly-linked list, which we already know how to write without fighting the borrow checker."
        },
        "code": "impl<T> Zipper<T> {\n    pub fn insert_right(&mut self, x: T) { self.right.push(x); }\n    pub fn insert_left(&mut self, x: T)  { self.left.push(x); }\n    pub fn remove_right(&mut self) -> Option<T> { self.right.pop() }\n    pub fn remove_left(&mut self)  -> Option<T> { self.left.pop() }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Two singly-linked stacks with their tops touching simulate a doubly-linked list with a cursor. Moving the cursor is one `pop`/`push` pair; edits are pushes and pops on whichever side. No back-pointers, no shared ownership, all ops are `O(1)`.",
      "dynamic": "If you split a doubly-linked list at the cursor, each half is just a stack. Keep the left half reversed so its top is closest to the cursor, and every operation — step, insert, remove — becomes one or two cheap singly-linked stack operations."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/infinity-double-single.html"
  },
  {
    "chapterId": "infinity",
    "chapterNum": 7,
    "chapterTitle": "A Bunch of Silly Lists",
    "title": "The Stack-Allocated Linked List",
    "gesture": {
      "systems": "Recursion already builds a linked list. Each call frame holds locals and a return address pointing at the caller's frame. If you also pass a `&Frame` parameter pointing at the caller's data, the chain of frames *is* a linked list of nodes living on the program stack — no heap, no `Box`, no `Drop` problem.",
      "dynamic": "A stack frame is the patch of memory a function gets while it's running — its parameters and local variables. When function A calls function B, B's frame sits on top of A's, and when B returns its frame is gone. That \"on top of\" relationship is already a linked list: B's frame implicitly knows about A's. If we explicitly pass a reference from caller to callee, we make that list visible and usable, with zero heap allocation."
    },
    "steps": [
      {
        "prose": {
          "systems": "A node is a value plus an optional reference to the previous node. The lifetime `'a` ties it to the parent frame's node. `Option<&'a Frame<'a, T>>` is one pointer wide and lives entirely in registers or stack slots.",
          "dynamic": "Define a node that points back at its parent. The `'a` is a lifetime — Rust's way of tracking how long a borrow is valid. Here it says \"this node borrows from its parent's frame, which must outlive this one.\" Because the parent frame is still on the stack while the child is running, the borrow is always valid."
        },
        "code": "struct Frame<'a, T> {\n    elem: T,\n    parent: Option<&'a Frame<'a, T>>,\n}\n\nimpl<'a, T> Frame<'a, T> {\n    fn iter(&self) -> Iter<'_, T> {\n        Iter { node: Some(self) }\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The walker takes the parent frame's node by reference and constructs its own node on its own stack frame. Recurse with `Some(&me)`. When the call returns, `me` is gone — and so is its node, automatically.",
          "dynamic": "The recursive walker builds its node as a normal local variable, then calls itself passing `&me` so the child can see this frame's node. No heap allocation: each node is just a stack-local struct. When the function returns, its frame disappears, taking the node with it. There is nothing to free."
        },
        "code": "fn walk<'a, T: std::fmt::Debug>(\n    tree: &Tree<T>,\n    parent: Option<&'a Frame<'a, &'a T>>,\n) {\n    let me = Frame { elem: &tree.value, parent };\n\n    if tree.children.is_empty() {\n        // at a leaf — print the path from root to here\n        let path: Vec<_> = me.iter().collect();\n        println!(\"{:?}\", path.into_iter().rev().collect::<Vec<_>>());\n    }\n\n    for child in &tree.children {\n        walk(child, Some(&me));\n    }\n}",
        "lang": "rust"
      },
      {
        "prose": {
          "systems": "The iterator follows `parent` links upward. Yields `&T` from each frame. `Iter` itself is one pointer; the entire path lives on the stack and is visible to the leaf without ever copying or allocating.",
          "dynamic": "To read the path at a leaf, walk the `parent` chain back to the root. The iterator holds a single reference and follows pointers up the stack until it hits `None`. Every node on the path is a live local variable in some ancestor's frame — we are reading the call stack as a data structure."
        },
        "code": "struct Iter<'a, T> {\n    node: Option<&'a Frame<'a, T>>,\n}\n\nimpl<'a, T> Iterator for Iter<'a, T> {\n    type Item = &'a T;\n    fn next(&mut self) -> Option<&'a T> {\n        let n = self.node?;\n        self.node = n.parent;\n        Some(&n.elem)\n    }\n}",
        "lang": "rust"
      }
    ],
    "tldr": {
      "systems": "Recursion is a linked list of stack frames. Make it explicit by threading `Option<&'a Frame<'a, T>>` through recursive calls — you get a path-from-root with zero heap allocation, automatic cleanup on return, and lifetimes that statically guarantee no node outlives its parent.",
      "dynamic": "If you only need a path *during* a recursive walk, you don't need the heap. Each call builds a small local struct that points at its caller's struct; the chain ends when you return. The compiler verifies the back-pointers stay valid because each parent frame is still alive while its child runs."
    },
    "link": "https://rust-unofficial.github.io/too-many-lists/infinity-stack-allocated.html"
  }
];

export const flat = raw.map((s, i) => ({
  ...s,
  num: String(i + 1).padStart(2, '0'),
  orderIndex: i
}));

function buildChapters(sections) {
  const order = [];
  const map = new Map();
  for (const s of sections) {
    if (!map.has(s.chapterId)) {
      map.set(s.chapterId, {
        id: s.chapterId,
        num: s.chapterNum,
        title: s.chapterTitle,
        intro: s.chapterIntro || '',
        sections: []
      });
      order.push(s.chapterId);
    }
    map.get(s.chapterId).sections.push(s);
  }
  return order.map((id) => map.get(id));
}

export const chapters = buildChapters(flat);

export function next(num) {
  const i = flat.findIndex((s) => s.num === num);
  return i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
}

export function prev(num) {
  const i = flat.findIndex((s) => s.num === num);
  return i > 0 ? flat[i - 1] : null;
}

export function chapterOf(num) {
  const s = flat.find((s) => s.num === num);
  return s ? chapters.find((c) => c.id === s.chapterId) : null;
}

export function chapterIndexOf(num) {
  const c = chapterOf(num);
  return c ? chapters.indexOf(c) : -1;
}

export function nextChapter(num) {
  const i = chapterIndexOf(num);
  return i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null;
}

export function prevChapter(num) {
  const i = chapterIndexOf(num);
  return i > 0 ? chapters[i - 1] : null;
}

export function isFirstOfChapter(num) {
  const c = chapterOf(num);
  return c ? c.sections[0].num === num : false;
}

export function isLastOfChapter(num) {
  const c = chapterOf(num);
  return c ? c.sections[c.sections.length - 1].num === num : false;
}

export function positionInChapter(num) {
  const c = chapterOf(num);
  if (!c) return null;
  const i = c.sections.findIndex((s) => s.num === num);
  return { index: i, total: c.sections.length };
}
