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

**Catalysta** is an AI-friendly web framework for Node.js. We named it `Catalysta` because of its incredible speed, which works like a "witch's catalyst" to make your ideas happen unbelievably fast.

<br />

# 2. Why Use Catalysta?
**Catalysta** focuses on making your ideas real, very fast. It helps you turn your thoughts into working code quickly. You don't need to do pre-work like SEO optimization, template layouts, style resets, or preventing re-rendering. You can focus only on building your ideas.

A clear separation of work also boosts productivity amazingly. Because **Catalysta** has a clear separation between backend and frontend tasks, there are no code conflicts.

**Catalysta** is very conservative. The concepts you learn once will stay the same forever. You do not need to worry about learning new things when a new version comes out. You also do not need to change your code when you upgrade. Many developers like this consistency.

In short, **Catalysta** pursues these goals and ideas:
- **AI-friendly Development**(Scroll-based System)
- **Zero-configuration**(No complex setup to start)
- **Integrated Tools**(Backend, API, and frontend in one framework)
- **Perfect Work Separation**(Backend and frontend tasks are separate)
- **Evergreen Skills**(You learn it once, you use it forever)
- **Exceptionally Easy Debugging**(Helpful and clear error messages)

<br />

# 3. How to Use Catalysta?
**Catalysta** follows the ESM approach. It requires Node.js v24 or higher and Express.js v5 or higher.
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
    response.display('<h1> Hello, Catalysta! </h1>');
});
```
Unlike typical web frameworks, **Catalysta** does not require calling functions like `app.start()` or `app.listen()` to initialize the module or start the server. This is because each route is treated as a standalone micro web server.

Now run the index.mjs file using Node.js to start the web server:
```bash
> node index.mjs
```
The default port number for **Catalysta** is `4444`. Now, if you open a web browser and visit `localhost:4444`, you will see the message "Hello, Catalysta!" displayed in large text.


You may have noticed that when the entry point file is first executed, the smart **Catalysta** automatically generates an optimized project structure.
```plaintext
your-project/
│
├── catalysta/
│   │
│   ├── backend/
│   │   └── catalysts.mjs          # Core business logic (acts as Helper, Provider, Controller)
│   │
│   ├── frontend/
│   │   ├── favicon.ico
│   │   ├── index.ejs
│   │   ├── scripts.js
│   │   └── styles.css
│   │
│   └── access.log
│
└── index.mjs                      # Entry point of Catalysta (acts as Router)
```
As you can see, inside the **Catalysta** folder, the structure is divided into backend and frontend. If backend and frontend developers need to collaborate, they don’t have to worry about each other’s folders. Unlike other frameworks, **Catalysta** uses a scroll system, a one-file backend system. This means that backend developers can implement almost all business logic in the `catalysts.mjs` file.

The entry point file can be used in many ways, but its basic role is to act as a Router, connecting Routes with Controllers. With this file, Catalysta developers can view all Routes at a glance.

The `catalysts.mjs` file, which contains all business logic, can also be used in various ways, but its basic role is to act as a Helper, Controller, and Provider(Model) that can store or retrieve data.
Oh, and once you get used to these personified concepts such as Handler, Router, Helper, Controller, and Provider, you’ll find that development becomes highly logical.

**For reference:** <br />
A `Handler` refers to a function defined within a Route where the roles of Controller, Helper, and Provider are not separated but mixed together.

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
    const dataObject = dataProvider();
    if (request.isGet) {
        response.display(dataObject);
    }
};
```
**Catalysta** offers a unique feature that you won’t find in other frameworks. Specifically, the index.mjs file and the `catalysts.mjs` file automatically share information and functionality with each other, without the need to explicitly export or import their respective modules(**Catalysta** objects).

Now, let’s call `dataController` from `index.mjs`:
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/', function(request, response) {
    this.dataController(request, response);
});
```
To use the `this` keyword in this way, you must define functions using the traditional JavaScript function declaration syntax. While function declarations and arrow functions both work, the this keyword cannot be used inside them.

<br />

### 3-3. Usage(UI, Communication Between Humans and Apps)
**Catalysta** renders templates based on `EJS`.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/home', function(request, response) {
    response.display('home', {
        title: 'Home Page!'
    });
});
```
Interpreting the code above, it means that **Catalysta** will look for the `home.ejs` template file and pass the data object `{ title: 'Home Page' }` to it. This development approach is similar to the `MVC` design pattern, allowing you to separate business logic from presentation logic. As a result, it creates an environment where backend and frontend developers can collaborate effectively.

If the `home.ejs` template file does not exist and there is no data object to pass, **Catalysta** will simply output the string "home" on the page for that route.

Once a handler for the `/home` route is written, you can then create the corresponding `home.ejs` template file inside the frontend folder.
<br />

📄 `catalysta > frontend > home.ejs`
```html
<h1> Hello, this is <%= title %> </h1>
```
The data object passed from the handler can be rendered using `EJS` syntax, such as `<%= title %>`.

**Catalysta** comes with a built-in layout template that includes a style reset by default. Therefore, you only need to structure the part inside the `<body>` tag of a standard HTML document. If tags that cannot be used inside the `<body>` tag, such as `<head>` or `<title>`, are inserted into the template, **Catalysta** will refuse to render it.

All files inside the frontend folder (except for `.ejs` files) are treated as static assets, so they can be freely accessed within `.ejs` templates. For example, if you place a `favicon.ico` file in the frontend folder, it will automatically be applied as the website’s favicon in the browser without any additional configuration.

<br />

### 3-4. Reactors
If you want to create `Reactor` that responds to all requests, simply don't specify a route in the `on()` helper.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on(function(request, response) {
    console.log('I\'m the reactor!');
});
```
If you don’t define specific routes, the handler will respond to all incoming requests and log them to the console each time. This type of handler, which reacts to every request, is called a `Reactor`.

Since a `Reactor` handles all requests, it can be useful for things like logging.
For example:
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on(function(request, response) {
    this.logger(request, response);
});
```
This demonstrates how you can use **Catalysta**’s built-in helper to log each request.

<br />

### 3-6. Built-in Helpers(APIs)
**Catalysta** provides a variety of `built-in helpers` to assist with development. These built-in helpers are divided into two main categories: `Catalysta Helpers` and `Parameter Helpers`. Parameter Helpers are further divided into `Request Helpers` and `Response Helpers`.

### `catalysta.on()`
As explained earlier, if you register a function with the `on()` helper without a route, it becomes a `Reactor`—a handler that responds to all incoming requests. If you register a function with a route, it acts as a `Router` or an Endpoint Handler. Using the `on()` helper as a router makes it extremely easy to build a `RESTful API` server.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/delete/:id', async function(request, response) {
    const id = request.params.id;
    const url = 'http://localhost:3000/list/';
    if (request.isDelete) {
        await this.api('DELETE', url + id);
    }
});
```
You can also register a function along with a state, allowing it to act as a `State Handler`.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on(404, function(request, response) {
    response.status(404).display('Not found!');
});

catalysta.on('error', function(request, response) {
    response.status(500).display('Internal server error!');
});
```
The `on()` helper best represents the minimalism that **Catalysta** aims for. Simply calling the `on()` helper—without any additional setup—starts the web server. Each function defined with the `on()` helper is treated as an individual micro web service.

### `catalysta.off()`
**Catalysta** introduces a highly abstracted concept where micro web services defined with the `on()` helper can be temporarily disabled or shut down using the `off()` helper. This allows you to limit access or gracefully deactivate specific services when needed.
<br />

📄 `index.mjs`
```javascript
import catalysta from 'catalysta';

catalysta.on('/', function(request, response) {
    this.homeController(request, response);
});

catalysta.off('/test', function(request, response) {
    this.testController(request, response);
});

catalysta.on('/api{/:id}', function(request, response) {
    this.apiController(request, response);
});
```
By integrating all routers into the `index.mjs` file, developers can easily manage them at a glance.
This allows developers to gain a clearer understanding of the overall web service they are responsible for—just by looking at the index.mjs file.

<br />

### `response.display()`
Provides the necessary information to the requester. Responses can be rendered beautifully in a web browser, or delivered as structured `JSON` data. The `display()` helper supports three formats for output: `Object`, `Text`, and `Template`.
<br />

📄 `catalysta > backend > catalysts.mjs`
```javascript
const object = {
    status: 'OK',
    dataset: [
        { id: 1, title: 'one' },
        { id: 2, title: 'two' }
    ]
};

catalysta.objectController = function(request, response) {
    response.display(object);
};

catalysta.textController = function(request, response) {
    response.display('<h1> Hello, Catalysta! </h1>');
};

catalysta.templateController = function(request, response) {
    response.display('home', object);
};
```
When using the `display()` helper with a template, `EJS` is used as the view engine. As expected, data can be passed to the `EJS` template in the form of an object.

### `request.api()`
**Catalysta** includes a built-in `api()` helper designed to simplify communication between backends, or between the backend and frontend. With the `api()` helper, you can fetch data from the server, send data to update or store values, or even change application states—all with minimal effort.
<br />

📄 `catalysta > backend > catalysts.mjs`
```javascript
catalysta.apiController = async function(request, response) {
    const id = request.params.id;
    const url = 'http://localhost:3000/list/';

    if(request.isPost) {
        let content = await request.api('GET', url);
        return await request.api('POST', url, {
            id: content.length + 1,
            title: request.body.title;
        });
    }

    if(request.isPut) {
        return await request.api('PUT', url + id, request.body);
    }

    if(request.isGet) {
        let content = await request.api('GET', url + id);
        return response.display(content);
    }

    if(request.isDelete) {
        return await request.api('DELETE', url + id);
    }
};
```
For reference, the `api()` helper can be used in both `Catalysta Helper` and `Parameter Helper` styles, allowing access to the this keyword in either approach.

This document only introduces a few of the most useful built-in helpers. The usage examples provided are for demonstration purposes only, to help illustrate how things work. For detailed usage instructions and a full list of available built-in helpers, please visit the official [**Catalysta**](https://github.com/ohsahngah/catalysta) website!

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
- [Separation of Logic]()

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