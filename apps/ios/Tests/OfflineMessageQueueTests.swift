import Foundation
import Testing
@testable import Clawdbot

@Suite @MainActor struct OfflineMessageQueueTests {
    @Test func enqueueAddsMessage() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Hello", sessionKey: "test-session")

        #expect(queue.count == 1)
        #expect(queue.pending.first?.text == "Hello")
        #expect(queue.pending.first?.sessionKey == "test-session")
        #expect(queue.pending.first?.retryCount == 0)

        queue.clear()
    }

    @Test func dequeueRemovesMessage() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Message 1", sessionKey: "session")
        queue.enqueue(text: "Message 2", sessionKey: "session")

        let firstId = queue.pending.first!.id
        queue.dequeue(firstId)

        #expect(queue.count == 1)
        #expect(queue.pending.first?.text == "Message 2")

        queue.clear()
    }

    @Test func markFailedIncrementsRetryCount() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Retry test", sessionKey: "session")
        let id = queue.pending.first!.id

        queue.markFailed(id)
        #expect(queue.pending.first?.retryCount == 1)

        queue.markFailed(id)
        #expect(queue.pending.first?.retryCount == 2)

        queue.clear()
    }

    @Test func markFailedRemovesAfterMaxRetries() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Max retry test", sessionKey: "session")
        let id = queue.pending.first!.id

        // Max retries is 3
        queue.markFailed(id) // retry 1
        queue.markFailed(id) // retry 2
        queue.markFailed(id) // retry 3 - should remove

        #expect(queue.isEmpty)

        queue.clear()
    }

    @Test func clearRemovesAllMessages() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Message 1", sessionKey: "s1")
        queue.enqueue(text: "Message 2", sessionKey: "s2")
        queue.enqueue(text: "Message 3", sessionKey: "s3")

        #expect(queue.count == 3)

        queue.clear()

        #expect(queue.isEmpty)
        #expect(queue.count == 0)
    }

    @Test func isEmptyReturnsCorrectValue() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        #expect(queue.isEmpty)

        queue.enqueue(text: "Test", sessionKey: "session")
        #expect(!queue.isEmpty)

        queue.clear()
        #expect(queue.isEmpty)
    }

    @Test func enqueueWithThinkingLevel() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Deep thought", sessionKey: "session", thinking: "high")

        #expect(queue.pending.first?.thinking == "high")

        queue.clear()
    }

    @Test func dequeueNonExistentIdDoesNothing() async {
        let queue = OfflineMessageQueue()
        queue.clear()

        queue.enqueue(text: "Test", sessionKey: "session")
        let originalCount = queue.count

        queue.dequeue(UUID()) // Random ID that doesn't exist

        #expect(queue.count == originalCount)

        queue.clear()
    }
}
