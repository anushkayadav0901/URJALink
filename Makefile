# Usage: make run <profile> | make stop <profile>
# Examples: make run all, make run backend, make stop all, make stop backend

ifeq (run,$(firstword $(MAKECMDGOALS)))
  PROFILE := $(wordlist 2,2,$(MAKECMDGOALS))
  $(eval $(PROFILE):;@:)
endif

ifeq (stop,$(firstword $(MAKECMDGOALS)))
  PROFILE := $(wordlist 2,2,$(MAKECMDGOALS))
  $(eval $(PROFILE):;@:)
endif

.PHONY: run stop

run:
	docker compose --profile $(PROFILE) up -d --build

stop:
	docker compose --profile $(PROFILE) down
