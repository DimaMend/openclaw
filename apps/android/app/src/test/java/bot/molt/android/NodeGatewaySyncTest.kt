package bot.molt.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NodeGatewaySyncTest {
    @Test
    fun parseHexColorArgbParsesValidHex() {
        val result = parseHexColorArgb("#4F7A9A")
        assertEquals(0xFF4F7A9AL, result)
    }

    @Test
    fun parseHexColorArgbParsesWithoutHash() {
        val result = parseHexColorArgb("4F7A9A")
        assertEquals(0xFF4F7A9AL, result)
    }

    @Test
    fun parseHexColorArgbReturnsNullForInvalidLength() {
        assertNull(parseHexColorArgb("#FFF"))
        assertNull(parseHexColorArgb("#FFFFFFFF"))
        assertNull(parseHexColorArgb("12345"))
    }

    @Test
    fun parseHexColorArgbReturnsNullForEmpty() {
        assertNull(parseHexColorArgb(null))
        assertNull(parseHexColorArgb(""))
        assertNull(parseHexColorArgb("   "))
    }

    @Test
    fun parseHexColorArgbReturnsNullForInvalidHex() {
        assertNull(parseHexColorArgb("#GGGGGG"))
        assertNull(parseHexColorArgb("#ZZZZZZ"))
    }

    @Test
    fun parseHexColorArgbTrimsWhitespace() {
        val result = parseHexColorArgb("  #FFFFFF  ")
        assertEquals(0xFFFFFFFFL, result)
    }

    @Test
    fun normalizeMainKeyReturnsMainForNull() {
        assertEquals("main", normalizeMainKey(null))
    }

    @Test
    fun normalizeMainKeyReturnsMainForEmpty() {
        assertEquals("main", normalizeMainKey(""))
        assertEquals("main", normalizeMainKey("   "))
    }

    @Test
    fun normalizeMainKeyReturnsTrimmedValue() {
        assertEquals("custom-key", normalizeMainKey("  custom-key  "))
    }

    @Test
    fun isCanonicalMainSessionKeyReturnsTrueForMain() {
        assertTrue(isCanonicalMainSessionKey("main"))
        assertTrue(isCanonicalMainSessionKey("Main"))
        assertTrue(isCanonicalMainSessionKey("MAIN"))
        assertTrue(isCanonicalMainSessionKey("  main  "))
    }

    @Test
    fun isCanonicalMainSessionKeyReturnsFalseForOther() {
        assertFalse(isCanonicalMainSessionKey("custom"))
        assertFalse(isCanonicalMainSessionKey("session-1"))
        assertFalse(isCanonicalMainSessionKey(""))
    }
}
