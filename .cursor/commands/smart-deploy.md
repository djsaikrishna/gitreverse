# smart-deploy

after making the changes needed, create a branch, commit those changes and push it to origin.

once there's no change left locally, use the vercel cli on the pushed version of latest branch and see if deployment worked correctly.

If the branch is successfully deployed, merge it using gh cli.

If the branch isn't successfully deployed, find out the errors using vercel CLI, fix them, push again and see if deployment worked correctly. 

If successful, merge. if not, redo the cycle.

thanks.
