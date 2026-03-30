"""
Test file for installer_finder_agent
Tests if the agent returns valid Markdown with proper table format
"""

import asyncio
import re


async def test_installer_agent():
    """Test the installer agent and validate Markdown table output"""
    from business_logic.installer_finder_agent import find_solar_installers

    # Test data for San Francisco
    test_params = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "123 Market St, San Francisco, CA 94105",
        "system_size_kw": 8.5,
    }

    print("=" * 80)
    print("INSTALLER AGENT TEST")
    print("=" * 80)
    print(f"\nTest Parameters:")
    print(f"  Location: {test_params['address']}")
    print(f"  Coordinates: {test_params['latitude']}, {test_params['longitude']}")
    print(f"  System Size: {test_params['system_size_kw']} kW")
    print("\n" + "=" * 80)
    print("RESPONSE:")
    print("=" * 80)
    print()

    try:
        result = await find_solar_installers(**test_params)
        full_response = result["installers_markdown"]
        model_name = result["model_name"]

        print(full_response)
        print("\n" + "=" * 80)
        print("VALIDATION")
        print("=" * 80)
        print(f"\nModel: {model_name}")

    except Exception as e:
        print(f"\n\n❌ ERROR during execution: {str(e)}")
        import traceback

        traceback.print_exc()
        return False

    # Validate Markdown table format
    is_valid = validate_markdown_table(
        full_response,
        required_columns=[
            "Company Name",
            "Contact Info",
            "Reviews",
            "Address",
            "Specializations",
        ],
    )

    if is_valid:
        print("\n✅ Response is valid Markdown with proper table")
    else:
        print("\n❌ Response is NOT valid Markdown or missing required table")

    print("\n" + "=" * 80)
    return is_valid


def validate_markdown_table(text: str, required_columns: list) -> bool:
    """
    Validate if text contains proper Markdown table with required columns

    Checks for:
    - Table header with pipes (|)
    - Separator row with dashes (-)
    - At least one data row
    - Required columns present
    """
    if not text or len(text.strip()) < 50:
        print("❌ Response too short or empty")
        return False

    # More flexible table pattern - just check for header and separator
    has_header = bool(re.search(r"\|[^\n]+\|", text))
    has_separator = bool(re.search(r"\|[\s\-:]+\|", text))
    has_data_row = (
        len(re.findall(r"\|[^\n]+\|", text)) >= 3
    )  # At least header + separator + 1 data row

    has_table = has_header and has_separator and has_data_row

    checks = {
        "Has Markdown Table": has_table,
        "Has Pipe Characters (|)": "|" in text,
        "Has Table Separator (---)": has_separator,
        "Minimum Length (>200 chars)": len(text.strip()) > 200,
    }

    # Check for required columns
    for col in required_columns:
        # Check if column name appears in text (case insensitive, partial match)
        checks[f"Has '{col}' column"] = bool(
            re.search(col.replace(" ", r"[\s\+]*"), text, re.IGNORECASE)
        )

    print("\nMarkdown Table Validation Checks:")
    for check_name, result in checks.items():
        status = "✅" if result else "❌"
        print(f"  {status} {check_name}")

    # All checks should pass
    passed_checks = sum(checks.values())
    total_checks = len(checks)

    print(f"\nPassed: {passed_checks}/{total_checks} checks")

    return passed_checks == total_checks


async def main():
    """Run the test"""
    success = await test_installer_agent()

    if success:
        print("\n🎉 TEST PASSED: Installer agent returns valid Markdown table")
        exit(0)
    else:
        print("\n❌ TEST FAILED: Installer agent output is invalid")
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
