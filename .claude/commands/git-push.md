Run `git branch --show-current` to get the current branch name, then output it to the user like this:

"You are currently on the following branch: {branch name}. Do you wish to proceed?
1. Yes
2. No"

Wait for the user to respond.

- If the user selects **2 (No)** or types "no", say "Push cancelled." and stop — do not run any further commands.

- If the user selects **1 (Yes)** or types "yes", ask:

"What note would you like to add to this commit?"

Wait for the user to provide a note.

Once you have the note, run the following commands in sequence using the Bash tool:
1. `git add .`
2. `git commit -m "{the note the user provided}"`
3. `git push`

If any command produces an error, show the error output to the user clearly.

If all commands succeed, say: "Commit successful!"
