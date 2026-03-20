# Examples

Complete working examples for pptr scripts.

## Table of Contents

- [Form Filling](#form-filling)
- [Web Scraping](#web-scraping)
- [Login Automation](#login-automation)
- [Data Extraction](#data-extraction)
- [Error Handling](#error-handling)
- [Parallel Tasks](#parallel-tasks)
- [Interactive Workflows](#interactive-workflows)
- [Reusable Functions](#reusable-functions)

---

## Form Filling

Automate form submission with validation.

```yaml
meta:
  name: "contact-form"
  timeout: 30000

vars:
  BASE_URL: "https://example.com"
  TEST_EMAIL: "test@example.com"

open: "${BASE_URL}/contact"

actions:
  - type:
      selector: "input[name='name']"
      text: "John Doe"
  - type:
      selector: "input[name='email']"
      text: "${TEST_EMAIL}"
  - type:
      selector: "textarea[name='message']"
      text: "Hello, this is a test message!"
  - select:
      selector: "select[name='subject']"
      value: "general"
  - click: "button[type='submit']"
  - wait:
      selector: ".success-message"
      timeout: 5000
  - screenshot: "form-submitted.png"
  - log: "Form submitted successfully"
```

---

## Web Scraping

Extract structured data from a website.

```yaml
meta:
  name: "news-scraper"
  timeout: 60000

open: "https://news.ycombinator.com"

actions:
  - for:
      selector: ".titleline > a"
      as: link
    actions:
      - extract:
          selector: "${link}"
          save: title
      - extract:
          selector: "${link}"
          attribute: "href"
          save: url
      - log: "Title: ${title} | URL: ${url}"

  - write:
      file: "output/hacker-news-links.json"
      content: |
        {
          "scraped_at": "${env.DATE}",
          "links": ${links}
        }
```

---

## Login Automation

Handle login with credential management.

```yaml
meta:
  name: "login-automation"

vars:
  BASE_URL: "https://example.com"

functions:
  login:
    params:
      username: null
      password: null
    actions:
      - type:
          selector: "#username"
          text: "${username}"
      - type:
          selector: "#password"
          text: "${password}"
      - click: "#login-button"
      - wait:
          selector: ".dashboard"
          timeout: 10000
      - return: "success"

open: "${BASE_URL}/login"

actions:
  - input:
      prompt: "Enter username: "
      var: "username"
  - input:
      prompt: "Enter password: "
      var: "password"
      hide: true

  - login:
      username: "${username}"
      password: "${password}"

  - if:
      condition: "${result} === 'success'"
    then:
      - log: "Login successful"
      - screenshot: "dashboard.png"
    else:
      - log:
          message: "Login failed"
          level: ERROR
      - screenshot: "login-error.png"
```

---

## Data Extraction

Extract product information and save to file.

```yaml
meta:
  name: "product-extractor"

open: "https://example.com/products"

actions:
  - extract:
      selector: ".product"
      save: products
      fields:
        - selector: ".product-name"
          name: name
        - selector: ".product-price"
          name: price
        - selector: ".product-image"
          attribute: "src"
          name: image

  - log: "Found ${products.length} products"

  - write:
      file: "output/products.json"
      content: |
        {
          "extracted_at": "${env.DATE}",
          "total": ${products.length},
          "products": ${products}
        }

  - for:
      items: "${products}"
      as: product
    actions:
      - log: "${product.name}: ${product.price}"
```

---

## Error Handling

Handle potential failures gracefully.

```yaml
meta:
  name: "robust-automation"

open: "https://example.com"

actions:
  # Retry flaky operations
  - retry:
      times: 3
      delay: 2000
      backoff: exponential
    action:
      - click: "#load-data"
      - wait: ".data-loaded"

  # Try optional elements
  - try:
      action:
        - click: "#cookie-consent"
        - wait: ".cookie-closed"
    catch:
      - log: "Cookie consent not shown, continuing"

  # Check before actions
  - if:
      selector: ".maintenance-banner"
      visible: false
    then:
      - click: "#start-button"
    else:
      - log:
          message: "Site under maintenance"
          level: WARN
      - screenshot: "maintenance.png"
```

---

## Parallel Tasks

Run multiple tasks simultaneously.

```yaml
meta:
  name: "multi-site-check"

actions:
  - parallel:
      branches:
        - actions:
            - open: "https://site-a.com"
            - screenshot: "site-a-status.png"
            - extract:
                selector: "h1"
                save: site_a_title
        - actions:
            - open: "https://site-b.com"
            - screenshot: "site-b-status.png"
            - extract:
                selector: "h1"
                save: site_b_title
        - actions:
            - open: "https://site-c.com"
            - screenshot: "site-c-status.png"
            - extract:
                selector: "h1"
                save: site_c_title

  - log: "Site A: ${site_a_title}"
  - log: "Site B: ${site_b_title}"
  - log: "Site C: ${site_c_title}"
```

---

## Interactive Workflows

Multi-step processes with user input.

```yaml
meta:
  name: "interactive-workflow"

vars:
  BASE_URL: "https://example.com"

open: "${BASE_URL}"

actions:
  - log: "Welcome to the automation wizard!"

  - input:
      prompt: "Enter search term: "
      var: "search_term"

  - input:
      prompt: "Number of results (1-100): "
      var: "max_results"
      default: 10

  - type:
      selector: "#search-box"
      text: "${search_term}"
  - click: "#search-button"

  - for:
      selector: ".result-item"
      as: result
    actions:
      - if:
          condition: "${result_index} >= ${max_results}"
        then:
          - break

      - extract:
          selector: "${result} .title"
          save: title
      - log: "${result_index}: ${title}"

  - input:
      prompt: "Save results to file? (y/n): "
      var: "confirm"
      default: "n"

  - if:
      condition: "${confirm} === 'y'"
    then:
      - write:
          file: "output/search-results.txt"
          content: |
            Search: ${search_term}
            Results: ${max_results}
            ---
            ${results}
      - log: "Results saved!"
```

---

## Reusable Functions

Create modular, reusable action blocks.

```yaml
meta:
  name: "modular-automation"

functions:
  navigateAndCapture:
    params:
      url: null
      filename: null
    actions:
      - open: "${url}"
      - wait: "body"
      - screenshot: "${filename}"
      - return: "${filename}"

  fillForm:
    params:
      email: null
      name: null
    actions:
      - type:
          selector: "#name"
          text: "${name}"
      - type:
          selector: "#email"
          text: "${email}"
      - click: "#submit"

  checkElement:
    params:
      selector: null
      visible: true
    actions:
      - if:
          selector: "${selector}"
          visible: ${visible}
        then:
          - log: "${selector} found and visible"
          - return: true
        else:
          - log: "${selector} not found or hidden"
          - return: false

open: "https://example.com"

actions:
  # Use navigation function
  - navigateAndCapture:
      url: "https://site1.com"
      filename: "site1.png"

  - navigateAndCapture:
      url: "https://site2.com"
      filename: "site2.png"

  # Use form function
  - fillForm:
      name: "John Doe"
      email: "john@example.com"

  # Use check function with condition
  - checkElement:
      selector: ".success-message"

  - if:
      condition: "${result} === true"
    then:
      - log: "Form submitted successfully!"
      - screenshot: "success.png"
```

### Nested Functions

Functions can call other functions:

```yaml
functions:
  step1:
    params:
      value: null
    actions:
      - log: "Step 1: ${value}"
      - return: "${value}_step1"

  step2:
    params:
      value: null
    actions:
      - log: "Step 2: ${value}"
      - return: "${value}_step2"

  fullProcess:
    params:
      input: null
    actions:
      - step1:
          value: "${input}"
      - log: "After step1: ${result}"
      - step2:
          value: "${result}"

open: "https://example.com"

actions:
  - fullProcess:
      input: "start"
  - log: "Final result: ${result}"
```

---

## Conditional Workflows

Build complex decision trees.

```yaml
meta:
  name: "conditional-workflow"

vars:
  BASE_URL: "https://example.com"

open: "${BASE_URL}"

actions:
  # Step 1: Check user type
  - extract:
      selector: "body"
      save: page_content

  - if:
      selector: "#login-form"
      visible: true
    then:
      - log: "Login form detected"
      - input:
          prompt: "Username: "
          var: "username"
      - input:
          prompt: "Password: "
          var: "password"
          hide: true
      - click: "#login-button"
    else:
      - if:
          selector: "#guest-continue"
          visible: true
        then:
          - log: "Guest mode available"
          - click: "#guest-continue"
        else:
          - log:
              message: "Unknown page state"
              level: WARN

  # Step 2: Process based on results
  - wait: "body"
  - screenshot: "post-login.png"

  - if:
      selector: ".error-message"
      visible: true
    then:
      - log:
          message: "Error detected"
          level: ERROR
      - extract:
          selector: ".error-message"
          save: error_text
      - log: "Error: ${error_text}"
    else:
      - log: "Operation completed successfully"
      - extract:
          selector: ".user-name"
          save: user_name
      - log: "Welcome, ${user_name}!"
```

---

## Tab Management

Work with multiple browser tabs.

```yaml
meta:
  name: "tab-management"

open: "https://example.com"

actions:
  # Open multiple tabs
  - newTab: "https://docs.example.com"
  - newTab:
      url: "https://api.example.com"
      actions:
        - log: "API docs loaded"

  # Work in main tab
  - click: "#settings"
  - screenshot: "settings.png"

  # Switch between tabs
  - switchTab: 0
  - screenshot: "main-docs.png"

  - switchTab: 1
  - screenshot: "api-docs.png"

  # Close a tab and continue
  - closeTab
  - switchTab: 0
  - log: "Back to main tab"
```
