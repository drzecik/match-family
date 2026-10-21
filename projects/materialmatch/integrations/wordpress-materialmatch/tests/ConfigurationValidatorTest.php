<?php

declare(strict_types=1);

namespace MaterialMatch\WordPress\Tests;

use MaterialMatch\WordPress\Configuration\ConfigurationValidator;
use MaterialMatch\WordPress\Security\ImportException;
use MaterialMatch\WordPress\Tests\Fixtures\ConfigurationFixture;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ConfigurationValidatorTest extends TestCase
{
    public function testAcceptsCurrentStrictConfiguration(): void
    {
        (new ConfigurationValidator())->validate(ConfigurationFixture::valid());
        self::addToAssertionCount(1);
    }

    public function testAcceptsTheGeneratedTypeScriptReferenceConfiguration(): void
    {
        $path = dirname(__DIR__, 3) . '/examples/generated/flooring-configuration.json';
        $document = json_decode((string) file_get_contents($path), true, 64, JSON_THROW_ON_ERROR);

        (new ConfigurationValidator())->validate($document['configuration']);
        self::addToAssertionCount(1);
    }

    #[DataProvider('maliciousConfigurationProvider')]
    public function testRejectsUnknownExecutableConfigurationFields(array $configuration): void
    {
        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.unknown_field');
        (new ConfigurationValidator())->validate($configuration);
    }

    /** @return iterable<string, array{array<string, mixed>}> */
    public static function maliciousConfigurationProvider(): iterable
    {
        $formula = ConfigurationFixture::valid();
        $formula['formula'] = 'process.exit()';
        yield 'root formula' => [$formula];

        $variantCode = ConfigurationFixture::valid();
        $variantCode['mainProduct']['variants'][0]['javascript'] = 'alert(document.cookie)';
        yield 'variant javascript' => [$variantCode];

        $ruleCode = ConfigurationFixture::valid();
        $ruleCode['accessoryRules'][0]['calculation']['expression'] = 'eval(payload)';
        yield 'rule expression' => [$ruleCode];
    }

    public function testRejectsUnknownAccessoryReference(): void
    {
        $configuration = ConfigurationFixture::valid();
        $configuration['accessoryRules'][0]['accessoryProductId'] = 'missing';

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.unknown_accessory_reference');
        (new ConfigurationValidator())->validate($configuration);
    }

    public function testRejectsUnsupportedSchemaVersion(): void
    {
        $configuration = ConfigurationFixture::valid();
        $configuration['version']['schemaVersion'] = 2;

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.unsupported_schema_version');
        (new ConfigurationValidator())->validate($configuration);
    }

    public function testRejectsNullForAnOptionalTypedField(): void
    {
        $configuration = ConfigurationFixture::valid();
        $configuration['mainProduct']['variants'][0]['price'] = null;

        $this->expectException(ImportException::class);
        $this->expectExceptionMessage('configuration.expected_object');
        (new ConfigurationValidator())->validate($configuration);
    }
}
