from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from typing import TYPE_CHECKING

import pytest

from fava.core.tree import TreeNode
from fava.ext import ExtensionConfigError
from fava.ext import fava_ext_test
from fava.ext import find_extensions
from fava.ext.portfolio_list import PortfolioList

if TYPE_CHECKING:
    from fava.core import FavaLedger


def test_extension_load_config(small_example_ledger: FavaLedger) -> None:
    PortfolioList(small_example_ledger)

    with pytest.raises(ExtensionConfigError):
        PortfolioList(small_example_ledger, "{{")


def test_find_extensions() -> None:
    classes, errors = find_extensions(Path(), "NOMODULENAME")
    assert not classes
    assert len(errors) == 1
    assert (
        errors[0].message == 'Importing module "NOMODULENAME" failed.'
        "\nError: \"No module named 'NOMODULENAME'\""
    )

    classes, errors = find_extensions(Path(), "fava")
    assert not classes
    assert len(errors) == 1
    assert errors[0].message == 'Module "fava" contains no extensions.'

    path = Path(__file__).parent.parent / "src" / "fava" / "ext"
    classes, errors = find_extensions(path, "auto_commit")
    assert len(classes) == 1
    assert classes[0].__name__ == "AutoCommit"
    assert not errors

    path = Path(__file__).parent.parent / "src" / "fava" / "ext"
    classes, errors = find_extensions(path, "portfolio_list")
    assert len(classes) == 1
    assert classes[0].__name__ == "PortfolioList"
    assert not errors


@pytest.mark.parametrize(
    ("balances", "allocations"),
    [
        (["100", "-100"], [None, None]),
        (["100", "300"], [Decimal(25), Decimal(75)]),
        (["0", "100"], [None, Decimal(100)]),
        ([None, "100"], [None, Decimal(100)]),
        ([], []),
    ],
)
def test_sample_portfolio_zero_total(
    monkeypatch: pytest.MonkeyPatch,
    balances: list[str | None],
    allocations: list[Decimal | None],
) -> None:
    nodes = [TreeNode(f"Assets:Test{i}") for i in range(len(balances))]
    converted = iter(
        {"USD": Decimal(value)} if value is not None else {}
        for value in balances
    )
    monkeypatch.setattr(
        fava_ext_test,
        "g",
        SimpleNamespace(
            ledger=SimpleNamespace(
                options={"operating_currency": ["USD"]}, prices=None
            ),
            conv=SimpleNamespace(
                apply=lambda _balance, _prices: next(converted)
            ),
        ),
    )
    result = fava_ext_test._portfolio_data(nodes)
    assert [row[2] for row in result.rows] == allocations
    assert [row[1] for row in result.rows] == [
        Decimal(value) if value is not None else None for value in balances
    ]
