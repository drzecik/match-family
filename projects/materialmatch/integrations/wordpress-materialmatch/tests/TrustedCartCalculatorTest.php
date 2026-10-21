<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use InvalidArgumentException;
use MaterialMatch\WordPress\Storefront\TrustedCartCalculator;
use PHPUnit\Framework\TestCase;

final class TrustedCartCalculatorTest extends TestCase
{
    public function testRecalculatesTheReferenceBundleFromIntegerMeasurementFacts(): void
    {
        $lines = (new TrustedCartCalculator())->calculate($this->configuration(), $this->referenceInput());

        self::assertSame([
            ['sku' => 'FICTIONAL-MM-PANEL-NATURAL', 'quantity' => 10],
            ['sku' => 'FICTIONAL-MM-UNDERLAY', 'quantity' => 3],
            ['sku' => 'FICTIONAL-MM-SKIRTING', 'quantity' => 8],
        ], $lines);
    }

    public function testUsesSelectedOptionalAccessoriesOnlyWhenTheirTypedSelectionIsPresent(): void
    {
        $input = $this->referenceInput();
        $input['selectedOptionalAccessoryIds'] = ['vapor-barrier'];

        $lines = (new TrustedCartCalculator())->calculate($this->configuration(), $input);

        self::assertContains(['sku' => 'FICTIONAL-MM-VAPOR-BARRIER', 'quantity' => 2], $lines);
    }

    public function testRejectsManipulatedOrExecutableCalculationInputFields(): void
    {
        $input = $this->referenceInput();
        $input['formula'] = 'alert(document.cookie)';

        $this->expectException(InvalidArgumentException::class);
        (new TrustedCartCalculator())->calculate($this->configuration(), $input);
    }

    /** @return array<string, mixed> */
    private function configuration(): array
    {
        $document = json_decode(
            (string) file_get_contents(dirname(__DIR__, 3) . '/examples/generated/flooring-configuration.json'),
            true,
            64,
            JSON_THROW_ON_ERROR,
        );
        return $document['configuration'];
    }

    /** @return array<string, mixed> */
    private function referenceInput(): array
    {
        return [
            'project' => [
                'id' => 'trusted-reference',
                'wasteBasisPoints' => 800,
                'rooms' => [[
                    'id' => 'room-1',
                    'name' => 'Fikcyjne pomieszczenie',
                    'geometry' => [
                        'kind' => 'rectangle',
                        'lengthMillimeters' => 5000,
                        'widthMillimeters' => 4000,
                    ],
                    'excludedAreas' => [],
                    'doors' => [[
                        'id' => 'door-1',
                        'widthMillimeters' => 900,
                    ]],
                ]],
            ],
            'variantId' => 'fictional-panel-natural',
            'selectedOptionalAccessoryIds' => [],
        ];
    }
}
