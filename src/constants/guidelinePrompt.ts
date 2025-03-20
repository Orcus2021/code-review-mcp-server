export const STYLE_GUIDELINE_PROMPT = `
## Naming Convention Checklist

- [ ] Variables & Functions: Use camelCase
  - ✅ Correct: userName, getUserData
  - ❌ Incorrect: User_name, get_user_data

- [ ] Classes: Use PascalCase
  - ✅ Correct: User, ProductService
  - ❌ Incorrect: user, product_service

- [ ] Constants: Use UPPER_SNAKE_CASE
  - ✅ Correct: API_URL, MAX_USERS
  - ❌ Incorrect: apiUrl, MaxUsers

- [ ] Boolean Variables: Start with is, has, or can
  - ✅ Correct: isLoggedIn, hasPermission
  - ❌ Incorrect: loggedIn, permissionStatus
`;

export const CODE_REVIEW_GUIDELINE_PROMPT = `
## Code Review Checklist

### Single Responsibility Principle (SRP)

- [ ] A function should have one well-defined purpose

✅ **Good Example (One function, one responsibility)**
\`\`\`typescript
const fetchUserData = (userId: string) => api.get(\`/users/\${userId}\`);

const formatUserName = (user: User) => \`\${user.firstName} \${user.lastName}\`;
\`\`\`

❌ **Bad Example (Multiple responsibilities in one function)**
\`\`\`typescript
const getUserFullName = async (userId: string) => {
    const user = await api.get(\`/users/\${userId}\`);
    return \`\${user.firstName} \${user.lastName}\`;
};
\`\`\`

> 💡 Fetching data and formatting should be separate functions for better reusability.

### Open/Closed Principle (OCP)

- [ ] Functions should be open for extension but closed for modification

✅ **Good Example (Using higher-order functions for flexibility)**
\`\`\`typescript
const applyDiscount = (discountFn: (price: number) => number) =>
    (price: number) => discountFn(price);

const tenPercentOff = applyDiscount((price) => price * 0.9);
console.log(tenPercentOff(100)); // 90
\`\`\`

❌ **Bad Example (Modifying existing logic instead of extending it)**
\`\`\`typescript
const applyDiscount = (price: number, type: "seasonal" | "clearance") => {
    if (type === "seasonal") return price * 0.9;
    if (type === "clearance") return price * 0.8;
    return price;
};
\`\`\`

> 💡 Using higher-order functions makes it easier to extend behavior without modifying existing code.

### Liskov Substitution Principle (LSP)

- [ ] Subtypes should be replaceable without breaking the program

✅ **Good Example (Using function composition to ensure compatibility)**
\`\`\`typescript
const formatText = (formatter: (str: string) => string) => (text: string) => formatter(text);

const uppercaseFormatter = formatText((text) => text.toUpperCase());
console.log(uppercaseFormatter("hello")); // "HELLO"
\`\`\`

❌ **Bad Example (Breaking expected behavior by modifying inputs in-place)**
\`\`\`typescript
const formatText = (formatter: (str: string) => string) => (text: string) => {
    text = text.toUpperCase(); // Unexpected mutation
    return formatter(text);
};
\`\`\`

> 💡 Ensure that any function expecting another function as input can handle all valid cases.

### Interface Segregation Principle (ISP)

- [ ] Keep function interfaces small and specific rather than having a large function with many parameters

✅ **Good Example (Small, composable functions)**
\`\`\`typescript
const getUserEmail = (user: { email: string }) => user.email;
const getUserName = (user: { firstName: string; lastName: string }) => \`\${user.firstName} \${user.lastName}\`;
\`\`\`

❌ **Bad Example (Function that requires unnecessary data)**
\`\`\`typescript
const getUserInfo = (user: { email: string; firstName: string; lastName: string; age: number }) => ({
    email: user.email,
    name: \`\${user.firstName} \${user.lastName}\`
});
\`\`\`

> 💡 Smaller functions improve reusability and reduce unnecessary dependencies.

### Dependency Inversion Principle (DIP)

- [ ] Functions should depend on abstractions rather than specific implementations

✅ **Good Example (Passing dependencies as arguments)**
\`\`\`typescript
const fetchData = (fetchFn: (url: string) => Promise<any>) => (url: string) => fetchFn(url);

const fetchWithAxios = fetchData(axios.get);
const fetchWithFetchAPI = fetchData(fetch);
\`\`\`

❌ **Bad Example (Hardcoded dependencies, reducing flexibility)**
\`\`\`typescript
const fetchData = async (url: string) => await axios.get(url);
\`\`\`

> 💡 Abstract dependencies for better testability and reusability.

### Immutability

- [ ] Avoid modifying existing data structures

✅ **Good Example (Using immutable updates)**
\`\`\`typescript
const updateUser = (user: User, newName: string) => ({ ...user, name: newName });
\`\`\`

❌ **Bad Example (Mutating the original object)**
\`\`\`typescript
const updateUser = (user: User, newName: string) => {
    user.name = newName; // ❌ Side effect
    return user;
};
\`\`\`

> 💡 Immutability prevents unintended side effects and improves debugging.

### Readability

- [ ] Write code that is easy to understand at a glance

✅ **Good Example (Descriptive function and variable names)**
\`\`\`typescript
const isActiveUser = (user: User) => user.isActive;

const activeUsers = users.filter(isActiveUser);
\`\`\`

❌ **Bad Example (Ambiguous variable and function names)**
\`\`\`typescript
const fn = (arr: any[]) => arr.filter((x) => x.a);
\`\`\`

> 💡 Good naming conventions improve maintainability and reduce cognitive load.

### Function Composition

- [ ] Prefer function composition over deeply nested functions

✅ **Good Example (Using \`pipe\` to chain functions)**
\`\`\`typescript
import { pipe } from "lodash/fp";

const addPrefix = (str: string) => \`Prefix: \${str}\`;
const toUpperCase = (str: string) => str.toUpperCase();

const formatMessage = pipe(addPrefix, toUpperCase);
console.log(formatMessage("hello")); // "PREFIX: HELLO"
\`\`\`

❌ **Bad Example (Deeply nested function calls)**
\`\`\`typescript
const formatMessage = (str: string) => toUpperCase(addPrefix(str));
\`\`\`

> 💡 Function composition improves readability and modularity.
`;
