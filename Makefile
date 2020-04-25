
all: compile deploy

compile: | apps/webhook/node_modules
	(cd apps/webhook && npm run build)

apps/webhook/node_modules:
	(cd apps/webhook && npm install)


deploy: | cloud/node_modules
	(cd cloud && cdk deploy)

cloud/node_modules:
	(cd cloud && npm install)

clean:
	(cd apps/webhook && npm run clean)
	(cd cloud && npm run clean)
	-@rm -Rf cloud/cdk.out
	-@rm -Rf cloud/cdk.context.json
	-@rm -Rf cloud/node_modules
	-@rm -Rf apps/webhook/node_modules
