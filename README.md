# Libraries / Node Modules
you need Node.js and npm be installed.
type `npm install` to get all node modules indicated in the `package.json`

# ProcessChangeVisualizer

This project uses Angular CLI as frontend.
Type `ng serve` for calling a development server that is accessible at `http://localhost:4200/`.
Type `ng build` to build the project with angular.

# Documentation 

The file `simple-class-diagram.drawio` gives a rough overview about the classes in this project.

Run `npx typedoc` to generate typescript code documentation in the `docs/` folder.
You can find there already some documentation about the most important aspects.


# Entry point
The main data model classes are `src/app/lib/process-change-model.ts` and `src/app/lib/interactive-svg.ts`.
The `change-vis-component.ts` is the component displayed on the website and serves as entry point.

