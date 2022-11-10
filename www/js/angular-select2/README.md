# angular-select2

> [select2](http://ivaynberg.github.io/select2/) bindings for Angular.JS

## Installation
Add angular-select2 to your project:

```
bower install --save angular-select2
```

Add it to your HTML file:

```html
<script src="bower_components/angular-select2/dist/angular-select2.min.js"></script>
```

Reference it as a dependency for your app module:

```js
angular.module('myApp', ['rt.select2']);
```

## Usage
Usage a similar to a normal select with `ngOptions`:

```html
<select2 ng-model="obj.field" s2-options="val.id as val.name for val in values"></select2>
```

*Note: using `ng-options` was supported until Angular 1.4 made this impossible. When upgrading to Angular.JS 1.4, be sure to replace all instances of `ng-options` to `s2-options`.*

In fact, you can replace any `<select>` tag by a `<select2>` tag and it should just work.

A multi-selection works similarly: add a `multiple` attribute.

You can set any [select2](http://ivaynberg.github.io/select2/) option by passing an options object:

```html
<select2 ng-model="obj.field" s2-options="val.id as val.name for val in values" options="{ allowClear: true }"></select2>
```

## Async loading of data
Async-loaded data can by used by leaving out the `s2-options` attribute and by specifying a `query` function:

```js
angular.module('myApp').controller('MyController', function ($scope) {
    $scope.queryOptions = {
        query: function (query) {
            var data = {
                results: [
                    { id: "1", text: "A" },
                    { id: "2", text: "B" }
                ]
            };

            query.callback(data);
        }
    };
});
```

```html
<select2 ng-model="values.query" options="queryOptions"></select2>
```

## Custom formatting, restrictions, tokenization, ...
This directive is just simple glue to the underlying select2.

[Check the select2 documentation for an overview of the full capabilities.](http://ivaynberg.github.io/select2/)

## Configuring global defaults
You can set a default for any option value by using `select2Config`:

```js
angular.module("myApp").run(function (select2Config) {
    select2Config.minimumResultsForSearch = 7;
    select2Config.dropdownAutoWidth = true;
});
```

## License 

    (The MIT License)

    Copyright (C) 2013-2015 by Ruben Vermeersch <ruben@rocketeer.be>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
