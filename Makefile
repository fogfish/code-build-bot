
all: compile deploy

compile: | apps/webhook/node_modules
	(cd apps/webhook; npm run build)

apps/webhook/node_modules:
	(cd apps/webhook; npm install)


deploy: | cloud/node_modules
	(cd cloud; cdk deploy)

cloud/node_modules:
	(cd cloud; npm install)