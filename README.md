<div align="center">
    <img width="256" src="https://ohsahngah.github.io/catalysta/logo.webp" />
    <p style="font-size: 20px;">- <b>the Dark Web Framework for Witches</b> -</p>
    <p align="center">
        <a href="#1-what-is-catalysta"><strong>WHAT</strong></a> • 
        <a href="#2-why-use-catalysta"><strong>WHY</strong></a> • 
        <a href="#3-how-to-use-catalysta"><strong>HOW</strong></a> • 
        <a href="#4-whos-behind-catalysta"><strong>WHO</strong></a> • 
        <a href="#5-whats-next"><strong>NEXT</strong></a>
    </p>
</div>

<br />

# 1. What is Catalysta?
![node](https://img.shields.io/node/v/catalysta)
[![npm version](https://img.shields.io/npm/v/catalysta.svg)](https://www.npmjs.org/package/catalysta)
[![install size](https://packagephobia.com/badge?p=catalysta)](https://packagephobia.com/result?p=catalysta)
[![npm downloads](https://img.shields.io/npm/dt/catalysta.svg)](https://npm-stat.com/charts.html?package=catalysta)
[![Downloads](https://img.shields.io/npm/dy/catalysta.svg)](https://www.npmjs.com/package/catalysta)
[![License](https://img.shields.io/npm/l/catalysta.svg)](https://github.com/ohsahngah/catalysta/blob/main/LICENSE)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

Catalysta is an AI-friendly web framework for Node.js. We named it `Catalysta` because of its incredible speed, which works like a "witch's catalyst" to make your ideas happen unbelievably fast.

<br />

# 2. Why Use Catalysta?
Catalysta focuses on making your ideas real, very fast. It helps you turn your thoughts into working code quickly. You don't need to do pre-work like SEO optimization, template layouts, style resets, or preventing re-rendering. You can focus only on building your ideas.

A clear separation of work also boosts productivity amazingly. Because Catalysta has a clear separation between backend and frontend tasks, there are no code conflicts.

Catalysta is very conservative. The concepts you learn once will stay the same forever. You do not need to worry about learning new things when a new version comes out. You also do not need to change your code when you upgrade. Many developers like this consistency.

In short, Catalysta pursues these goals and ideas:
- **AI-friendly Development**(Scroll-based System)
- **Zero-configuration**(No complex setup to start)
- **Integrated Tools**(Backend, API, and frontend in one framework)
- **Perfect Work Separation**(Backend and frontend tasks are separate)
- **Evergreen Skills**(You learn it once, you use it forever)
- **Exceptionally Easy Debugging**(Helpful and clear error messages)

<br />

# 3. How to Use Catalysta?
Catalysta follows the ESM approach. It requires Node.js v24 or higher and Express.js v5 or higher.
You can easily start Catalysta in your new or existing project with the following command:
```bash
> npm install catalysta
```

<br />

### 3-1. Quick Start
Create the entry point file for **Catalysta** named `index.mjs`. You may choose any filename for the entry point, but the extension must be `.mjs`.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/', function(request, response) {
    response.display('<h1>Hello, Catalysta!</h1>');
});
```
Unlike typical web frameworks, Catalysta does not require calling functions like `app.start()` or `app.listen()` to initialize the module or start the server. This is because each route is treated as a standalone micro web server.

Now run the index.mjs file using Node.js to start the web server:
```bash
> node index.mjs
```
The default port number for Catalysta is `4444`. Now, if you open a web browser and visit `localhost:4444`, you will see the message "Hello, Catalysta!" displayed in large text.


You may have noticed that when the entry point file is first executed, the smart Catalysta automatically generates an optimized project structure.
```plaintext
your-project/
│
├── catalysta/
│   │
│   ├── backend/
│   │   └── catalysts.mjs          # Core business logic (acts as Helper, Provider, Controller)
│   │
│   ├── frontend/
│   │   ├── index.ejs
│   │   ├── scripts.js
│   │   └── styles.css
│   │
│   └── access.log
│
└── index.mjs                      # Entry point of Catalysta (acts as Router)
```
As you can see, inside the catalysta folder, the structure is divided into backend and frontend. If backend and frontend developers need to collaborate, they don’t have to worry about each other’s folders. Unlike other frameworks, Catalysta uses a scroll system, a one-file backend system. This means that backend developers can implement almost all business logic in the catalysts.mjs file.

The entry point file can be used in many ways, but its basic role is to act as a Router, connecting Routes with Controllers. With this file, Catalysta developers can view all Routes at a glance.

The catalysts.mjs file, which contains all business logic, can also be used in various ways, but its basic role is to act as a Helper, Controller, and Provider (Model) that can store or retrieve data.
Oh, and once you get used to these personified concepts such as Handler, Router, Helper, Controller, and Provider, you’ll find that development becomes highly logical.

> A Handler refers to a function defined within a Route where the roles of Controller, Helper, and Provider are not separated but mixed together.

<br />

### 3.2. Usage(API, Implementing Communication Between Apps)
Now, let’s create a simple API server using the `catalysts.mjs` file by adopting a development approach that separates roles.
<br />

📄 `catalysta > backend > catalysts.mjs`
```javascript
// Private Functions
// Define internal helpers or models that should be hidden
function dataProvider() {
    return {
        dataset: [
            { id: 1, title: 'One' },
            { id: 2, title: 'Two' }
        ]
    }
};


// Public Functions
// Define middleware or controllers
catalysta.dataController = function(request, response) {
    if (request.isGet) {
        response.display(dataProvider());
    }
};
```
Catalysta offers a unique feature that you won’t find in other frameworks. Specifically, the index.mjs file and the catalysts.mjs file automatically share information and functionality with each other, without the need to explicitly export or import their respective modules (Catalysta objects).

Now, let’s call dataController from index.mjs:
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/', function(request, response) {
    this.dataController(request, response);
});
```
To use the this keyword in this way, you must define functions using the traditional JavaScript function declaration syntax. While function declarations and arrow functions both work, the this keyword cannot be used inside them.

<br />

### 3-3. Usage(UI, Communication Between Humans and Apps)
Catalysta renders templates based on EJS.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/home', function(request, response) {
    response.display('home', {
        title: 'Home Page'
    });
});
```
Interpreting the code above, it means that Catalysta will look for the home.ejs template file and pass the data object { title: 'Home Page' } to it. This development approach is similar to the MVC design pattern, allowing you to separate business logic from presentation logic. As a result, it creates an environment where backend and frontend developers can collaborate effectively.

If the home.ejs template file does not exist and there is no data object to pass, Catalysta will simply output the string "home" on the page for that route.

Once a handler for the /home route is written, you can then create the corresponding home.ejs template file inside the frontend folder.
<br />

📄 `catalysta > frontend > home.ejs`
```html
<h1>Hello, this is <%= title %>!</h1>
```
The data object passed from the handler can be rendered using EJS syntax, such as `<%= title %>`.

Catalysta comes with a built-in layout template that includes a style reset by default. Therefore, you only need to structure the part inside the `<body>` tag of a standard HTML document. If tags that cannot be used inside the `<body>` tag, such as `<head>` or `<title>`, are inserted into the template, Catalysta will refuse to render it.

All files inside the frontend folder (except for `.ejs` files) are treated as static assets, so they can be freely accessed within `.ejs` templates. For example, if you place a favicon.ico file in the frontend folder, it will automatically be applied as the website’s favicon in the browser without any additional configuration.

<br />

### 3-4. Middleware
If you want to create middleware that responds to all requests, simply don't specify a route in the `on` handler.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on(function(request, response) {
    console.log('middleware');
});
```

<br />

### 3-6. APIs
APIs are provided through the official [Catalysta](https://github.com/ohsahngah/catalysta) website.

<br />

### 3-5. Useful Tips
Here are some useful tips to help you solve problems more easily using Catalysta in various scenarios.

- [Creating a Simple API Server]()
- [Creating a Loading Screen]()
- [Applying a Favicon]()
- [Detecting Mobile Devices]()
- [Creating a 404 Page]()
- [Temporarily Restricting Routes]()
- [Logging]()
- [File Upload and Download]()
- [Implementing Login]()
- [Changing the Port Number]()
- [Running a Static Web Server]()

<br />

# 4. Who's behind Catalysta?
Catalysta is currently operated by the developers who use it and the contributors who offer their full, unwavering support.

- [OhSahngAh](https://github.com/ohsahngah) / Creator of Catalysta
- [ChoeJeongHun]() / Contributor
- [ChoeHyoJin]() / Contributor
- [ParkBeomChan]() / Contributor

Become a contributor to Catalysta! Attaining contributor status gives you the right to propose agenda items and vote on the future of Catalysta. Additionally, you will be listed in the contributor section of the README file with a link back to you.
[[Become a sponsor]()]

<br />

# 5. What's Next?
We are building the future of Catalyst with multiple contributors.

### Agenda Items
- Improve README to be easily understood by developers
- ~~Add a reliable timestamp middleware~~ (Completed)
- ~~Add a simple logger middleware~~ (Completed)
- Add a simple authentication middleware
- Support LevelDB ORM

<br />

### A Small Request
This document was originally written in Korean and translated into English so that developers around the world can read it. We have tried to use simple words and expressions in English to make it easy for everyone to understand. However, if you find any words or sentences that are incorrect or awkward, please let us know!

Contact:<br />
📧 ohsahngah@gmail.com