"""
llm_tutor.py

Claude-backed AI tutor with a rich knowledge-base fallback so the app
works even when the API key has no credits.
"""

import os
import json
import requests
import random

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# ── Rich CS knowledge base (real answers for fallback) ───────────────────────

KNOWLEDGE_BASE = {
    "recursion": {
        "explanation": "Recursion is when a function calls itself to solve a smaller version of the same problem. Every recursive function needs two parts: a base case (the stopping condition) and a recursive case (where it calls itself). Think of it like Russian nesting dolls — each doll contains a smaller doll, until you reach the tiny solid one that stops. Tip: always write the base case first, then think about how the problem gets smaller with each call.",
        "questions": [
            {"question": "What are the two essential parts of every recursive function?", "answer": "Every recursive function needs: (1) a Base Case — a condition that stops the recursion without another call, and (2) a Recursive Case — where the function calls itself with a smaller/simpler input. Without the base case, recursion runs forever and causes a stack overflow."},
            {"question": "What happens when a recursive function has no base case?", "answer": "Without a base case, the function calls itself infinitely. Each call adds a new frame to the call stack. Eventually the stack runs out of memory and throws a StackOverflow error (or in Python, RecursionError). Always define your base case before anything else."},
            {"question": "Trace the factorial of 4 (4!) step by step using recursion.", "answer": "factorial(4) = 4 × factorial(3) = 4 × 3 × factorial(2) = 4 × 3 × 2 × factorial(1) = 4 × 3 × 2 × 1 = 24. The base case is factorial(1) = 1 (or factorial(0) = 1). The call stack builds up going down, then unwinds returning values going back up."},
            {"question": "How is recursion different from a regular loop?", "answer": "A loop (iteration) repeats code in place using counter variables. Recursion repeats by calling the same function, using the call stack to remember state. Recursion is more elegant for tree/graph problems or 'divide and conquer' algorithms. Loops use less memory. Any recursive solution can be converted to iterative and vice versa."},
            {"question": "What is tail recursion and why does it matter?", "answer": "Tail recursion is when the recursive call is the very last operation in the function — nothing happens after it returns. Compilers can optimize tail recursion into a loop (tail call optimization), preventing stack overflow. Python does NOT do this optimization, but languages like Haskell and Scala do."},
        ],
        "hints": ["Think about: what is the simplest case that doesn't need further calculation?", "Remember: recursion = base case + smaller problem", "Draw the call tree on paper — what does each level return?"],
    },
    "arrays": {
        "explanation": "An array is a collection of elements stored in contiguous memory locations, all of the same type. Elements are accessed via an index starting at 0. Arrays offer O(1) access by index but O(n) search. Tip: visualize an array as a row of numbered boxes — box 0 is the first.",
        "questions": [
            {"question": "What is the index of the first element in an array?", "answer": "The first element is at index 0. This is called zero-based indexing, used in most languages (Python, Java, C, JavaScript). An array of n elements has valid indices 0 through n-1. Trying to access index n gives an IndexOutOfBounds error."},
            {"question": "What is the time complexity of accessing an element by index in an array?", "answer": "O(1) — constant time. Because arrays are stored in contiguous memory, the CPU can jump directly to any element using: address = base_address + (index × element_size). No searching needed."},
            {"question": "How do you find the length of an array and why does it matter?", "answer": "Length tells you how many elements exist, so you know the valid index range (0 to length-1). In Python: len(arr). In Java: arr.length. Always check bounds before accessing to avoid IndexOutOfBoundsException. A common bug is writing arr[length] instead of arr[length-1]."},
            {"question": "What is the difference between a static array and a dynamic array?", "answer": "Static arrays have a fixed size set at creation (like C arrays). Dynamic arrays (like Python lists, Java ArrayList) can grow automatically — when full, they allocate a larger block (~2× size), copy all elements, and continue. This gives amortized O(1) append but occasional O(n) copies."},
            {"question": "How would you reverse an array in-place without using extra memory?", "answer": "Use two pointers: left starting at index 0, right starting at index n-1. Swap arr[left] and arr[right], then move left++ and right-- until left >= right. This runs in O(n) time and O(1) space because no extra array is needed."},
        ],
        "hints": ["Remember zero-based indexing: first element is at position 0", "Think about memory: arrays are stored in one continuous block", "Consider the trade-off: fast access by position, slow search by value"],
    },
    "merge sort": {
        "explanation": "Merge Sort is a divide-and-conquer sorting algorithm. It splits the array in half, recursively sorts each half, then merges them back in sorted order. It always runs in O(n log n) time — even in the worst case. Tip: the 'merge' step is the key — always compare the front elements of each half and pick the smaller one.",
        "questions": [
            {"question": "What is the time complexity of Merge Sort in the best, average, and worst case?", "answer": "Merge Sort is O(n log n) in all three cases — best, average, and worst. This is because it always divides in half (log n levels) and merges all n elements at each level. Unlike Quick Sort, Merge Sort has no worst-case O(n²) scenario. This predictability makes it reliable for large datasets."},
            {"question": "What algorithmic paradigm does Merge Sort use and how does it apply?", "answer": "Merge Sort uses Divide and Conquer. (1) Divide: split array in half recursively until each sub-array has 1 element. (2) Conquer: a single element is trivially sorted. (3) Merge: combine two sorted halves into one sorted array. The recursion tree has log n levels, each doing O(n) work."},
            {"question": "What is the space complexity of Merge Sort and why?", "answer": "O(n) extra space — Merge Sort needs a temporary array during the merge step to hold the combined result. This is a disadvantage compared to in-place sorts like Quick Sort or Heap Sort which use O(log n) or O(1) extra space. The trade-off is the guaranteed O(n log n) time."},
            {"question": "How does the merge step actually work? Walk through merging [1,3,5] and [2,4,6].", "answer": "Use two pointers, one for each array. Compare elements: 1 vs 2 → take 1. 3 vs 2 → take 2. 3 vs 4 → take 3. 5 vs 4 → take 4. 5 vs 6 → take 5. Take remaining 6. Result: [1,2,3,4,5,6]. Always compare the front elements, take the smaller one, advance that pointer."},
            {"question": "Is Merge Sort stable? What does stability mean?", "answer": "Yes, Merge Sort is stable. Stability means equal elements maintain their original relative order. When merging, if two elements are equal, we take from the left array first, preserving order. Stability matters when sorting objects by multiple keys (e.g. sort by name, then by age — stability preserves the name order within same age)."},
        ],
        "hints": ["Think: divide in half → sort each half → merge sorted halves", "The merge step compares front elements of each sorted portion", "log n levels × n work per level = n log n total"],
    },
    "joins": {
        "explanation": "A JOIN combines rows from two or more tables based on a related column. INNER JOIN returns only matching rows. LEFT JOIN returns all left rows + matching right rows (NULL if no match). RIGHT JOIN is the mirror. FULL OUTER JOIN returns everything. Tip: think of Venn diagrams — INNER is the intersection, LEFT includes the full left circle.",
        "questions": [
            {"question": "What is the difference between INNER JOIN and LEFT JOIN?", "answer": "INNER JOIN returns only rows that have matching values in BOTH tables — rows without a match are excluded. LEFT JOIN returns ALL rows from the left table, and matching rows from the right. If no match exists, right-table columns are NULL. Use LEFT JOIN when you want all records even if some don't have related data."},
            {"question": "When would you use a LEFT JOIN instead of an INNER JOIN?", "answer": "Use LEFT JOIN when you want ALL records from the main (left) table even if they have no matching record in the other table. Example: list all students and their grades — a student with no grades should still appear, with NULL for grade columns. With INNER JOIN, that student would be invisible."},
            {"question": "What does NULL mean in the result of a LEFT JOIN?", "answer": "NULL in the right-table columns of a LEFT JOIN result means that row from the left table had NO matching row in the right table. It's not zero or empty string — it means 'no data exists'. Always use IS NULL or IS NOT NULL to check for NULLs, never = NULL (which always returns false)."},
            {"question": "Write a SQL query to find all students who have NOT submitted any assignment.", "answer": "SELECT s.name FROM Students s LEFT JOIN Assignments a ON s.id = a.student_id WHERE a.student_id IS NULL. The LEFT JOIN includes all students. The WHERE clause filters to only those where the assignment join returned NULL — meaning no matching assignment found. This is the classic 'find missing records' pattern."},
            {"question": "What is a CROSS JOIN and when would you use it?", "answer": "A CROSS JOIN returns the Cartesian product — every combination of rows from both tables. If table A has 3 rows and table B has 4, the result has 12 rows. Use cases: generating all possible combinations (e.g., all shirt sizes × all colors), or creating test data. It's rarely used in production — it can produce massive result sets."},
        ],
        "hints": ["Visualize with Venn diagrams: INNER = intersection, LEFT = full left circle", "LEFT JOIN never loses rows from the left table", "Check for NULL in right columns to find unmatched records"],
    },
    "binary search": {
        "explanation": "Binary search finds an element in a sorted array by repeatedly halving the search range. Compare the middle element — if it matches, done; if target is smaller, search the left half; if larger, search the right half. This gives O(log n) time. Tip: the array MUST be sorted first, or binary search gives wrong answers.",
        "questions": [
            {"question": "What is the time complexity of binary search and why?", "answer": "O(log n). Each comparison eliminates half the remaining elements. Starting with n elements: after 1 comparison: n/2 remain. After 2: n/4. After k: n/2^k. We stop when 1 element remains: n/2^k = 1, so k = log₂(n). For 1 billion elements, binary search takes at most 30 comparisons."},
            {"question": "What is the prerequisite for binary search to work correctly?", "answer": "The array must be sorted. Binary search relies on the sorted property to know which half to eliminate. If the array is unsorted, you might eliminate the half that contains the target, giving a wrong 'not found' answer. If you need to search an unsorted array, first sort it (O(n log n)) then binary search, or use linear search O(n) directly."},
            {"question": "How do you avoid integer overflow when calculating the middle index?", "answer": "Instead of mid = (left + right) / 2, use mid = left + (right - left) / 2. In languages with 32-bit integers (Java, C), if left and right are both large, left + right can overflow. The second formula never overflows because (right - left) is always smaller than the max int value."},
            {"question": "Trace binary search for target=7 in [1,3,5,7,9,11,13].", "answer": "Array indices 0-6. left=0, right=6, mid=3, arr[3]=7. Target found at index 3 in just 1 comparison! Best case. If target were 9: mid=3, arr[3]=7 < 9, so search right: left=4, right=6, mid=5, arr[5]=11 > 9, so search left: left=4, right=4, mid=4, arr[4]=9. Found in 3 comparisons."},
            {"question": "What is the difference between binary search finding an element vs finding the insertion point?", "answer": "Finding an element: return the index when arr[mid] == target, return -1 if not found. Finding the insertion point (lower_bound): return the index where target should be inserted to keep array sorted. This is useful when the element might not exist. Python's bisect module implements this. The insertion point is where all elements to its left are < target."},
        ],
        "hints": ["Remember: array must be sorted first!", "Eliminate half the search space with each comparison", "Calculate mid as left + (right-left)//2 to avoid overflow"],
    },
    "linked list": {
        "explanation": "A linked list is a sequence of nodes where each node stores data and a pointer to the next node. Unlike arrays, nodes are not stored contiguously — they're scattered in memory and connected by pointers. Tip: always check for null before dereferencing a pointer — the most common linked list bug.",
        "questions": [
            {"question": "What is the time complexity of inserting at the beginning vs end of a singly linked list?", "answer": "Inserting at beginning: O(1) — create new node, point it to current head, update head to new node. Inserting at end: O(n) — must traverse the entire list to find the last node, then link the new node. If you maintain a tail pointer, end insertion is also O(1). This is why linked lists are better than arrays for front insertions but equal for end insertions (with tail pointer)."},
            {"question": "How do you detect a cycle in a linked list?", "answer": "Use Floyd's Cycle Detection (tortoise and hare): two pointers start at head. Slow moves 1 step, fast moves 2 steps per iteration. If there's a cycle, fast will eventually 'lap' slow and they'll meet. If fast reaches NULL, no cycle. Time O(n), Space O(1). Alternative: use a HashSet of visited nodes — but that uses O(n) space."},
            {"question": "How do you reverse a singly linked list in-place?", "answer": "Use three pointers: prev=NULL, curr=head, next=NULL. While curr is not NULL: save next = curr.next, set curr.next = prev, advance prev = curr, advance curr = next. After the loop, prev is the new head. This runs in O(n) time and O(1) space — no extra memory needed."},
            {"question": "What is the advantage of a doubly linked list over a singly linked list?", "answer": "A doubly linked list has pointers to BOTH next and previous nodes. Advantage: O(1) backward traversal and deletion of a known node (no need to find the previous node). Disadvantage: twice the memory for pointers. Use doubly linked lists when you need to traverse backwards or implement features like a browser's back/forward history, LRU cache, or a text editor's undo/redo."},
            {"question": "How do you find the middle element of a linked list in one pass?", "answer": "Use two pointers: slow and fast, both starting at head. Move slow by 1 step and fast by 2 steps each iteration. When fast reaches the end (or fast.next is NULL), slow is at the middle. For even-length lists, this gives the second middle element. This is the 'runner technique' — fast pointer covers twice the distance."},
        ],
        "hints": ["Always check for NULL before accessing a node's next pointer", "Draw boxes and arrows on paper — linked list problems become visual", "Two-pointer technique solves many linked list problems efficiently"],
    },
    "dynamic programming": {
        "explanation": "Dynamic programming (DP) solves complex problems by breaking them into overlapping subproblems and storing solutions to avoid recomputation. Two key properties: optimal substructure (optimal solution contains optimal sub-solutions) and overlapping subproblems (same subproblems are solved multiple times). Tip: start with recursion, identify what's recomputed, then memoize it.",
        "questions": [
            {"question": "What are the two key properties a problem must have for Dynamic Programming to apply?", "answer": "(1) Optimal Substructure: the optimal solution to the whole problem can be built from optimal solutions of its subproblems. (2) Overlapping Subproblems: the same smaller problems are solved multiple times. If subproblems don't overlap (like in Merge Sort), it's divide-and-conquer, not DP."},
            {"question": "What is the difference between memoization (top-down) and tabulation (bottom-up) DP?", "answer": "Memoization (top-down): write the recursive solution, add a cache (dict/array) to store results, check cache before computing. Natural to write, solves only needed subproblems. Tabulation (bottom-up): fill a table iteratively starting from smallest subproblems up to the answer. No recursion stack overhead, better space optimization possible."},
            {"question": "What is the time and space complexity of computing Fibonacci with DP vs naive recursion?", "answer": "Naive recursion: O(2^n) time (exponential — recalculates same values millions of times). Memoized DP: O(n) time and O(n) space (each value computed once). Optimized DP: O(n) time and O(1) space (only keep last two values). The difference between O(2^n) and O(n) is enormous — for n=50, naive ≈ 10^15 operations vs DP ≈ 50."},
            {"question": "Explain the Longest Common Subsequence (LCS) problem and its DP approach.", "answer": "LCS finds the longest sequence of characters that appear in the same order in both strings (not necessarily contiguous). DP: build an (m+1)×(n+1) table where dp[i][j] = LCS of first i chars of s1 and first j chars of s2. If s1[i]==s2[j], dp[i][j] = dp[i-1][j-1] + 1. Else dp[i][j] = max(dp[i-1][j], dp[i][j-1]). Time O(mn), space O(mn)."},
            {"question": "How would you approach the 0/1 Knapsack problem using DP?", "answer": "Given n items with weights and values, and a knapsack capacity W: dp[i][w] = max value using first i items with capacity w. For each item i and capacity w: if item weight > w, dp[i][w] = dp[i-1][w] (skip item). Else dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i]) (skip or take). Answer is dp[n][W]. Time O(nW), space O(nW)."},
        ],
        "hints": ["Start by writing the plain recursive solution, then optimize", "Identify what changes in each recursive call — those are your DP dimensions", "Draw the DP table and fill it manually for small examples first"],
    },
    "trees": {
        "explanation": "A tree is a hierarchical data structure with nodes connected by edges, where any node can be reached from the root by exactly one path. Binary trees have at most 2 children per node. BSTs maintain the property: left subtree < node < right subtree. Tip: most tree problems have elegant recursive solutions.",
        "questions": [
            {"question": "What is the difference between a Binary Tree and a Binary Search Tree (BST)?", "answer": "A Binary Tree just means each node has at most 2 children (left and right) — no ordering constraint. A Binary Search Tree (BST) adds the ordering property: all nodes in the left subtree < current node's value < all nodes in the right subtree. This enables O(log n) search in balanced BSTs vs O(n) linear search in unstructured binary trees."},
            {"question": "What are the three types of tree traversal and when would you use each?", "answer": "In-order (Left, Root, Right): for a BST, this visits nodes in sorted order — useful for getting sorted output. Pre-order (Root, Left, Right): visits root first — useful for copying/serializing a tree. Post-order (Left, Right, Root): visits root last — useful for deleting a tree or evaluating expression trees (compute children before parent)."},
            {"question": "What is the height of a tree and how do you calculate it recursively?", "answer": "Height = the longest path from root to any leaf. Recursively: height(null) = -1 (or 0 depending on definition). height(node) = 1 + max(height(node.left), height(node.right)). A tree with 1 node has height 0. For a balanced binary tree, height ≈ log n. For a degenerate tree (linked list shape), height = n-1."},
            {"question": "What is a balanced binary tree and why does it matter for performance?", "answer": "A balanced binary tree ensures no leaf is 'much farther' from the root than any other (usually height difference ≤ 1 between subtrees, like in AVL trees). This matters because BST operations (search, insert, delete) are O(height). Balanced: O(log n). Degenerate/unbalanced (worst case): O(n). Self-balancing trees (AVL, Red-Black) automatically maintain balance."},
            {"question": "How would you check if two binary trees are identical?", "answer": "Recursive approach: Two trees are identical if their roots have the same value AND their left subtrees are identical AND their right subtrees are identical. Base cases: both NULL → true. One NULL, one not → false. Code: isIdentical(a, b) { if(!a && !b) return true; if(!a || !b) return false; return a.val == b.val && isIdentical(a.left, b.left) && isIdentical(a.right, b.right); }"},
        ],
        "hints": ["Think recursively: trees are recursive by definition", "Base case is usually: what do you do with a null/leaf node?", "Draw a small example tree and trace through your algorithm"],
    },
    "hashing": {
        "explanation": "Hashing converts data into a fixed-size value (hash code) using a hash function, then stores it in a hash table for O(1) average lookup. Collisions (two keys hashing to the same slot) are handled via chaining (linked list at each slot) or open addressing. Tip: always know your hash map's time complexities — O(1) average, O(n) worst case.",
        "questions": [
            {"question": "What is a hash collision and how is it handled?", "answer": "A hash collision occurs when two different keys produce the same hash value (map to the same index). Two main solutions: (1) Chaining: each slot holds a linked list of all key-value pairs that hash there — O(1 + load factor) lookup. (2) Open Addressing: find the next empty slot (linear probing, quadratic probing, or double hashing). Python's dict uses open addressing with random probing."},
            {"question": "What is the load factor of a hash table and why does it matter?", "answer": "Load factor = (number of elements) / (table size). When load factor gets too high (e.g., > 0.7), collisions become frequent and performance degrades toward O(n). Hash tables resize (rehash) when load factor exceeds a threshold — copy all elements into a larger table. Python's dict resizes at ~2/3 load factor. This keeps average operations O(1)."},
            {"question": "Why can't you use a mutable object (like a list in Python) as a dictionary key?", "answer": "Dictionary keys must be hashable — their hash value cannot change during their lifetime. Mutable objects (lists, dicts) can be modified after creation, which would change their hash value and make them unfindable in the hash table (stored at old hash, but looked up at new hash). Immutable objects (strings, tuples, ints, frozensets) have stable hash values and are safe as keys."},
            {"question": "How would you find the first non-repeating character in a string using hashing?", "answer": "Two-pass approach: Pass 1: count frequency of each character using a hash map. Pass 2: iterate the original string and return the first character whose count is 1. Time O(n), Space O(1) (at most 26 letters in English). Alternative single-pass: use an OrderedDict to maintain insertion order and update counts."},
            {"question": "Explain the difference between HashMap and HashSet.", "answer": "HashMap stores key-value pairs and allows you to look up values by key. HashSet stores only keys (no values) — it's a collection of unique elements. Internally, most HashSet implementations ARE a HashMap where all values are the same dummy object. Use HashMap when you need to associate data with keys. Use HashSet for membership testing or deduplication."},
        ],
        "hints": ["Hash maps trade memory for speed: O(1) average lookup at the cost of extra space", "Collisions are inevitable — know how your language handles them", "Keys must be immutable/hashable — can't use lists as Python dict keys"],
    },
    "graphs": {
        "explanation": "A graph is a set of vertices (nodes) connected by edges. Can be directed or undirected, weighted or unweighted. Key algorithms: BFS (shortest path in unweighted graphs), DFS (cycle detection, topological sort), Dijkstra (shortest path in weighted graphs). Tip: always clarify if the graph is directed, weighted, and whether it can have cycles.",
        "questions": [
            {"question": "What is the difference between BFS and DFS, and when would you use each?", "answer": "BFS (Breadth-First Search) explores level by level using a queue. Use for: shortest path in unweighted graphs, level-order traversal, finding closest node. DFS (Depth-First Search) explores as deep as possible using a stack/recursion. Use for: cycle detection, topological sorting, finding all paths, maze solving. BFS finds the shortest path; DFS is simpler to implement recursively."},
            {"question": "How do you represent a graph in code? Compare adjacency matrix vs adjacency list.", "answer": "Adjacency Matrix: V×V boolean/weight matrix where matrix[i][j] = 1 if edge exists. Space: O(V²). Good for dense graphs, fast edge lookup O(1). Adjacency List: array of lists where list[i] contains all neighbors of vertex i. Space: O(V+E). Good for sparse graphs, fast neighbor iteration. Most real graphs are sparse, so adjacency lists are more common."},
            {"question": "What is a topological sort and when can you apply it?", "answer": "Topological sort orders vertices of a Directed Acyclic Graph (DAG) so that for every edge u→v, u appears before v in the ordering. Can ONLY be applied to DAGs (no cycles — cycles mean no valid ordering). Use cases: task scheduling (dependencies), course prerequisites, build systems. Algorithm: DFS and push to stack when a vertex is fully explored, or use Kahn's algorithm with in-degrees."},
            {"question": "How does Dijkstra's algorithm find the shortest path in a weighted graph?", "answer": "Dijkstra starts from source, maintains a priority queue of (distance, vertex) pairs and a dist[] array initialized to infinity except source=0. Each iteration: extract minimum-distance vertex, relax all its edges (if dist[u] + weight(u,v) < dist[v], update dist[v] and add to queue). Works only with non-negative weights. Time: O((V+E) log V) with a binary heap."},
            {"question": "How do you detect a cycle in a directed graph?", "answer": "DFS with three color states: WHITE (unvisited), GRAY (currently in DFS stack), BLACK (fully processed). If during DFS you reach a GRAY vertex, you've found a back edge = cycle. Start DFS from each unvisited vertex. If no back edges found, no cycle. Alternative: Kahn's topological sort — if the sorted result has fewer vertices than the graph, a cycle exists."},
        ],
        "hints": ["BFS uses a queue (FIFO), DFS uses a stack (LIFO) or recursion", "Always track visited nodes to avoid infinite loops in cyclic graphs", "Draw the graph on paper and trace the algorithm step by step"],
    },
    "sorting": {
        "explanation": "Sorting arranges elements in a specific order. Key algorithms: Bubble Sort (O(n²), simple), Selection Sort (O(n²), min swaps), Insertion Sort (O(n²), great for nearly sorted), Merge Sort (O(n log n), stable, extra space), Quick Sort (O(n log n) average, in-place, not stable), Heap Sort (O(n log n), in-place). Tip: for most practical use, use your language's built-in sort — it's highly optimized.",
        "questions": [
            {"question": "Why is Quick Sort generally faster than Merge Sort in practice despite both being O(n log n)?", "answer": "Quick Sort has better cache performance (in-place, accesses memory sequentially) and lower constant factors. Merge Sort requires O(n) extra memory and cache misses during merging. Quick Sort with good pivot choice (median-of-three) averages O(n log n) and rarely hits O(n²). However, Merge Sort is preferred when: stability is needed, worst-case guarantees matter, or sorting linked lists."},
            {"question": "What makes Insertion Sort efficient for nearly sorted arrays?", "answer": "Insertion Sort scans each element and inserts it in its correct position among already-sorted elements. For nearly sorted arrays, each element only moves a few positions — the inner loop does very little work. Time complexity: O(n + k) where k = number of inversions. For a nearly sorted array with few inversions, this approaches O(n). It's also adaptive (automatically faster on sorted input) and stable."},
            {"question": "What is counting sort and when should you use it instead of comparison-based sorts?", "answer": "Counting Sort counts occurrences of each element, then reconstructs the sorted array from counts. Time: O(n + k) where k = range of values. Space: O(k). Use when: k is small relative to n (e.g., sorting exam scores 0-100, or DNA bases). Do NOT use when k is huge (sorting 64-bit integers would need 2^64 space). It's not comparison-based, so it breaks the O(n log n) lower bound for comparison sorts."},
            {"question": "Explain the concept of in-place sorting. Which algorithms are in-place?", "answer": "An in-place sorting algorithm sorts by modifying the original array with only O(1) or O(log n) extra space (for recursion stack). In-place: Bubble Sort, Selection Sort, Insertion Sort, Heap Sort, Quick Sort (O(log n) stack). NOT in-place: Merge Sort (O(n) temp array), Counting Sort (O(k) count array), Radix Sort. In-place sorts are memory-efficient but may sacrifice stability or worst-case guarantees."},
            {"question": "What is the lower bound for comparison-based sorting algorithms and why?", "answer": "The lower bound is Ω(n log n). Proof by decision tree: any comparison-based sort can be modeled as a binary tree of comparisons. The tree must have at least n! leaves (all possible permutations). A binary tree with n! leaves has height ≥ log₂(n!) ≈ n log n (by Stirling's approximation). So any comparison-based sort must make at least n log n comparisons. Merge Sort, Heap Sort, Quick Sort are all optimal."},
        ],
        "hints": ["The best comparison-based sort is O(n log n) — this is mathematically proven", "Stability means equal elements keep their original relative order", "For practical use, built-in sort (Python's Timsort, Java's TimSort) is almost always best"],
    },
}

def _call_claude(system_prompt: str, user_message: str, max_tokens: int = 400) -> str | None:
    """Try Claude API. Returns None on failure."""
    if not ANTHROPIC_API_KEY:
        return None
    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-3-haiku-20240307",
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_message}],
            },
            timeout=12,
        )
        response.raise_for_status()
        return response.json()["content"][0]["text"]
    except Exception:
        return None


def _find_knowledge(concept: str) -> dict | None:
    """Find the knowledge base entry for a concept (case-insensitive, fuzzy)."""
    c = concept.lower().strip()
    for key, val in KNOWLEDGE_BASE.items():
        if key in c or c in key:
            return val
    return None


def ask_claude(question: str, graph_connection: dict = None) -> str:
    """Answer a student question using Claude or the knowledge base fallback."""
    system_prompt = (
        "You are a friendly, expert CS tutor. Give a clear, complete answer in 3-5 sentences. "
        "Use a real example. End with one practical tip. Reply in English always."
    )
    if graph_connection:
        user_msg = (
            f"Question: {question}\n\n"
            f"Note: this topic connects to the student's past struggle with "
            f"{graph_connection['connectedWeakness']}: \"{graph_connection['pastMistake']}\". "
            f"Naturally mention this connection in your explanation."
        )
    else:
        user_msg = f"Question: {question}"

    result = _call_claude(system_prompt, user_msg, max_tokens=350)
    if result:
        return result

    # Rich fallback — find knowledge base entry
    kb = _find_knowledge(question)
    if kb:
        explanation = kb["explanation"]
        if graph_connection:
            weakness = graph_connection.get("connectedWeakness", "a related concept")
            past = graph_connection.get("pastMistake", "a previous mistake")
            return (
                f"{explanation} "
                f"This connects to your earlier difficulty with {weakness} (\"{past}\") — "
                f"understanding that concept will strengthen your grasp of {question}."
            )
        return explanation

    # Generic fallback
    if graph_connection:
        w = graph_connection.get("connectedWeakness", "a related concept")
        p = graph_connection.get("pastMistake", "a past mistake")
        return (
            f"{question} is an important concept that builds on {w}. "
            f"Your past difficulty with '{p}' means you should pay special attention to the foundational ideas here. "
            f"Start with the simplest case first, build a working example, then generalise. "
            f"Tip: draw the process step-by-step on paper before writing code."
        )
    return (
        f"Great question about {question}! This is a core computer science concept. "
        f"Break it down into the smallest possible pieces — what inputs does it take, what should it output, "
        f"and what transformation happens in between? "
        f"Tip: find one concrete real-world example, understand it completely, then abstract the pattern."
    )


def generate_challenge_questions(concept: str, count: int = 5) -> list[dict]:
    """
    Generate count challenge questions for a concept.
    Returns list of {question, concept, correct_answer}.
    """
    system_prompt = (
        "You are a CS professor creating exam questions. "
        "Generate exactly the requested number of distinct questions about the given CS concept. "
        "Each question should test real understanding, not just memorisation. "
        "Output ONLY valid JSON: a list of objects, each with 'question' and 'correct_answer' fields. "
        "correct_answer should be 2-4 sentences. No markdown, no extra text."
    )
    user_msg = f"Generate {count} questions about: {concept}. Output JSON only."

    result = _call_claude(system_prompt, user_msg, max_tokens=1200)
    if result:
        try:
            # Find the JSON array in the response
            start = result.find("[")
            end = result.rfind("]") + 1
            if start >= 0 and end > start:
                parsed = json.loads(result[start:end])
                return [{"question": q["question"], "concept": concept, "correct_answer": q.get("correct_answer", "")} for q in parsed[:count]]
        except Exception:
            pass

    # Fallback: use knowledge base
    kb = _find_knowledge(concept)
    if kb and kb.get("questions"):
        qs = kb["questions"]
        selected = random.sample(qs, min(count, len(qs)))
        result_list = [{"question": q["question"], "concept": concept, "correct_answer": q["answer"]} for q in selected]
        # Pad with generic questions if needed
        while len(result_list) < count:
            result_list.append({
                "question": f"Describe a real-world use case where understanding {concept} is critical.",
                "concept": concept,
                "correct_answer": f"Understanding {concept} is essential in many real-world systems. " + (kb["explanation"][:200] if kb else "")
            })
        return result_list

    # Generic fallback
    templates = [
        f"Explain {concept} as if you were teaching it to a beginner.",
        f"What is the time complexity of common {concept} operations? Why?",
        f"What are the main advantages and disadvantages of {concept}?",
        f"Describe a step-by-step example of {concept} in action.",
        f"Compare {concept} to an alternative approach. When would you choose each?",
        f"What is the most common mistake students make when learning {concept}?",
        f"Write pseudocode for a core operation involving {concept}.",
    ]
    return [
        {"question": templates[i % len(templates)], "concept": concept, "correct_answer": f"A complete understanding of {concept} includes knowing its definition, time/space complexity, common operations, and real-world applications. Review your class notes and work through at least 3 concrete examples."}
        for i in range(count)
    ]


def get_hint(question: str, concept: str) -> str:
    """Return a helpful hint for a challenge question without giving away the answer."""
    system_prompt = (
        "You are a helpful tutor. Give a useful hint for the question — "
        "guide the student toward the answer without revealing it. "
        "The hint should be 1-2 sentences, specific and actionable."
    )
    result = _call_claude(system_prompt, f"Question: {question}\nConcept: {concept}", max_tokens=100)
    if result:
        return result

    kb = _find_knowledge(concept)
    if kb and kb.get("hints"):
        return random.choice(kb["hints"])

    return f"Think about the core definition of {concept} first. What property or rule makes it unique? Start from that and work outward."


def get_correct_answer(question: str, concept: str) -> str:
    """Return the correct answer for a challenge question."""
    system_prompt = (
        "You are a CS professor. Give the correct, complete answer to this question in 3-5 sentences. "
        "Be specific, accurate, and educational. Include an example if helpful."
    )
    result = _call_claude(system_prompt, f"Question: {question}\nConcept: {concept}", max_tokens=250)
    if result:
        return result

    kb = _find_knowledge(concept)
    if kb:
        for q in kb.get("questions", []):
            if q["question"].lower()[:30] in question.lower():
                return q["answer"]
        return kb["explanation"]

    return f"The correct answer involves a deep understanding of {concept}. Key points: know its definition, time/space complexity, common implementations, and trade-offs vs alternatives. Review your textbook or lecture notes for a complete explanation."


def evaluate_answer(question: str, concept: str, student_answer: str) -> dict:
    """
    Use AI to evaluate a student's answer.
    Returns {score (0-100), passed (bool), feedback (str), correct_answer (str)}.
    """
    system_prompt = (
        "You are a strict but fair CS professor grading a student's answer. "
        "Evaluate the answer on accuracy, completeness, and clarity. "
        "Output ONLY valid JSON with exactly these fields: "
        "score (integer 0-100), feedback (string, 2-3 sentences, specific and constructive), "
        "correct_answer (string, the ideal answer in 3-5 sentences). "
        "No markdown, no extra text."
    )
    user_msg = f"Question: {question}\nConcept: {concept}\nStudent answer: {student_answer}"

    result = _call_claude(system_prompt, user_msg, max_tokens=400)
    if result:
        try:
            start = result.find("{")
            end = result.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(result[start:end])
                score = int(parsed.get("score", 50))
                return {
                    "score": score,
                    "passed": score >= 70,
                    "feedback": parsed.get("feedback", ""),
                    "correct_answer": parsed.get("correct_answer", get_correct_answer(question, concept)),
                }
        except Exception:
            pass

    # Keyword-based fallback evaluation
    correct_ans = get_correct_answer(question, concept)
    kb = _find_knowledge(concept)
    keywords = []
    if kb:
        for q in kb.get("questions", []):
            if q["question"] == question:
                # Extract key words from the answer
                words = q["answer"].lower().split()
                keywords = [w for w in words if len(w) > 5 and w.isalpha()][:10]
                break
    if not keywords:
        keywords = [concept.lower()] + concept.lower().split()

    answer_lower = student_answer.lower()
    matched = [kw for kw in keywords if kw in answer_lower]
    score = min(95, max(10, int(len(matched) / max(len(keywords), 1) * 100)))
    passed = score >= 70

    if passed:
        feedback = f"Good answer! You covered the key ideas about {concept}. " + ("Consider adding more specific examples to strengthen your explanation." if score < 90 else "Excellent understanding demonstrated.")
    elif score >= 40:
        feedback = f"Partially correct. You've understood some aspects of {concept}, but the answer is incomplete. Review the key concepts and try to be more specific and precise."
    else:
        feedback = f"This answer needs more work. Study {concept} more carefully, focusing on its definition, how it works, and concrete examples."

    return {"score": score, "passed": passed, "feedback": feedback, "correct_answer": correct_ans}
