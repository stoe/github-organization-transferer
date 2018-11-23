#!/usr/bin/env node

"use strict";

require("dotenv").config();

const chalk = require("chalk");
const octokit = require("@octokit/rest")({
  headers: {}
});

(async () => {
  try {
    octokit.authenticate({
      type: "token",
      token: process.env.PAT
    });

    let repos = [];
    const repos_file_path = process.env.REPOS_FILE_PATH;
    const owner = process.env.OWNER;
    const new_owner = process.env.NEW_OWNER;

    if (repos_file_path !== "false") {
      repos = require(repos_file_path);
    } else {
      repos = await octokit
        .paginate("GET /orgs/:owner/repos", { owner }, res =>
          res.data.map(r => r.name)
        )
        .then(names => {
          return names;
        });
    }

    if (repos.length < 1) {
      console.log(
        `${chalk.yellow("ABORT")}: no repositories found on ${chalk.dim(
          owner
        )} to transfer`
      );
      process.exit(0);
    }

    const team_ids = await octokit
      .paginate("GET /orgs/:owner/teams", { owner }, res =>
        res.data.map(t => t.id)
      )
      .then(id => {
        return id;
      });

    for (const repo of repos) {
      try {
        const transfer = await octokit.repos.transfer({
          owner,
          repo,
          new_owner,
          team_ids
        });
      } catch (e) {
        throw new Error(
          `${chalk.blue(repo)} does not exist on ${chalk.dim(owner)}`
        );
      }

      console.log(
        `${chalk.green("SUCCESS")}: transfered ${chalk.blue(
          repo
        )} from ${chalk.dim(owner)} to ${chalk.dim(new_owner)}`
      );
    }
  } catch (e) {
    console.error(`${chalk.red("ERROR")}: ${e.message}`);
  }
})();
