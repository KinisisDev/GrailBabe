import { inngest } from "../client";

  export const helloWorld = inngest.createFunction(
{ id: "hello-world", name: "Hello World" },
{ event: "grailbabe/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.name ?? "World"}!` };
},
);
