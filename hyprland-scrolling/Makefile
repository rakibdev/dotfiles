ifeq ($(CXX),g++)
    EXTRA_FLAGS = --no-gnu-unique
else
    EXTRA_FLAGS =
endif

CXXFLAGS = -shared -fPIC -std=c++23 -Wno-c++11-narrowing
INCLUDES  = $(shell pkg-config --cflags hyprland libdrm libinput libudev wayland-server xkbcommon)
TARGET    = libscrolling-patches.so

all: $(TARGET)

$(TARGET): main.cpp
	$(CXX) $(CXXFLAGS) $(EXTRA_FLAGS) $(INCLUDES) $< -o $@ -O2 -lrt

clean:
	rm -f $(TARGET)

.PHONY: all clean
