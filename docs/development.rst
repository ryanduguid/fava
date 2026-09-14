Development
===========

Setting up a development environment
------------------------------------

If you want to hack on Fava or run the latest development version, make sure
you have recent enough versions of the following installed (ideally with your
system package manager):

- `Python 3`_ - as Fava is written in Python,
- `Node.js`_ - with `npm`, to build the frontend,
- Make - to run various build / lint/ test targets,
- `uv`_ - to install the development environment and run scripts.

.. _Python 3: https://www.python.org/
.. _Node.js: https://nodejs.org/
.. _uv: https://docs.astral.sh/uv/

Then this will get you up and running:

.. code:: bash

    git clone https://github.com/beancount/fava.git
    cd fava
    # setup a virtual environment (at .venv) and install Fava and development
    # dependencies into it:
    make dev

You can start Fava in the virtual environment as usual by running ``fava``.
Running in debug mode with ``fava --debug`` is useful for development.

You can run the tests with ``make test`` and the linters by running ``make
lint``. There are further make targets defined, see the `Makefile` for details.
After any changes to the Javascript code, you will need to re-build the
frontend, which you can do by running ``make``. If you are working on the
frontend code, you can use ``make watch`` to rerun the build on file changes.

For a source build of Beancount, choose a revision whose package version meets
the ``beancount>=3.2.0,<4`` requirement in ``pyproject.toml``. For example:

.. code:: bash

    uv pip install git+https://github.com/beancount/beancount@3.2.0
    uv pip check

For an unreleased change, replace the tag with a reviewed commit from the
compatible version series and check its package version before installing it.

Contributions are very welcome, just open a PR on `GitHub`_.

Fava is released under the `MIT License`_.

.. _GitHub: https://github.com/beancount/fava/pulls
.. _MIT License: https://github.com/beancount/fava/blob/main/LICENSE

