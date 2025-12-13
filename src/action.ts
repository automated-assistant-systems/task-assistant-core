import * as core from "@actions/core";
import * as gha from "@actions/github";
import { runAction } from "./index";

runAction({
  context: gha.context,
  getInput: core.getInput,
  setOutput: core.setOutput,
  setFailed: core.setFailed
});
